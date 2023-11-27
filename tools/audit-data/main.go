package main

import (
	"context"
	"fmt"
	"github.com/jackc/pgx/v5"
	"github.com/urfave/cli/v2"
	"log/slog"
	"os"
	"time"
)

const (
	host   = "/var/run/postgresql"
	port   = 5433
	user   = "conjur-audit"
	dbname = "audit"
)

func main() {
	app := &cli.App{
		Name:  "load-audit-data",
		Usage: "Load sample data in audit table",
		Flags: []cli.Flag{
			&cli.IntFlag{Name: "days", Usage: "Specify for how many days data should be generated", Aliases: []string{"d"}, Value: 14},
			&cli.IntFlag{Name: "months", Usage: "Specify for how many months data should be generated", Aliases: []string{"m"}, Value: 0},
			&cli.IntFlag{Name: "years", Usage: "Specify for how many years data should be generated", Aliases: []string{"y"}, Value: 0},
		},
		Action: func(cCtx *cli.Context) error {
			conn, err := connectToDatabase()
			if err != nil {
				return err
			}
			defer conn.Close(context.Background())

			err = loadData(cCtx.Int("days"),
				cCtx.Int("months"),
				cCtx.Int("years"),
				conn,
			)
			if err != nil {
				return err
			}

			return nil
		},
	}

	if err := app.Run(os.Args); err != nil {
		slog.Error("Error occurred while executing app", "error", err)
	}
}

func connectToDatabase() (*pgx.Conn, error) {
	psqlInfo := fmt.Sprintf("host=%s port=%d user=%s "+
		"dbname=%s sslmode=disable",
		host, port, user, dbname)
	conn, err := pgx.Connect(context.Background(), psqlInfo)
	if err != nil {
		slog.Error("Unable to connect to database", "error", err)
		return nil, err
	}

	slog.Info("Successfully connected to the database!")

	return conn, nil
}

func loadData(days, months, years int, conn *pgx.Conn) error {
  slog.Info(fmt.Sprintf("days: %d, months: %d, years: %d", days, months, years))
	now := time.Now()
	initialDate := now.AddDate(-years, -months, -days)
	dayDuration := 24 * time.Hour

	// Prepare query that will generate data for each second in a day
	sqlStatement := `
			INSERT INTO messages (facility, severity, timestamp, hostname, appname, procid, msgid, sdata, message)
			select 10,
				   6,
				   ($1)::timestamptz + (n || ' seconds')::interval,
				   'ca1a7704ed48',
				   'conjur',
				   '266765ba-5099-4025-8c08-05d1f9d347be',
				   'update',
				   '{"auth@43868": {"user": "demo:user:admin"}, "action@43868": {"result": "success", "operation": "update"}, "client@43868": {"ip": "12.16.23.10"}, "subject@43868": {"resource": "demo:variable:production/my-app-6/postgres-database/password"}}',
				   'demo:user:admin updated demo:variable:production/my-app-6/postgres-database/password'
			FROM generate_series(0, 86400) n;
		`

	// Simulate 30 requests per second by re-executing same query 30x times
	requestPerSecond := 30
	for i := 0; i < requestPerSecond; i++ {
		currentDay := initialDate

		for currentDay.Before(now) {
			_, err := conn.Exec(context.Background(), sqlStatement, currentDay)
			if err != nil {
				slog.Error("Unable to execute query", "error", err)
				return err
			}

			dayEndDate := currentDay.Add(dayDuration - time.Second)
			slog.Info("Successfully inserted day",
				"iteration", fmt.Sprintf("%v/%v", i+1, requestPerSecond), "startDayDate", currentDay.Format(time.DateTime), "endDayDate", dayEndDate.Format(time.DateTime))

			currentDay = currentDay.Add(dayDuration)
		}
	}

	slog.Info("Successfully inserted all historic data!")

	return nil
}
