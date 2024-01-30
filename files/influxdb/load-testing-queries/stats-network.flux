start_time={{ START_TIME }}
end_time={{ END_TIME }}

stats = from(bucket: "telegraf")
  |> range(start: start_time, stop: end_time)
  |> filter(fn: (r) => r["_measurement"] == "net")
  |> filter(fn: (r) => r["_field"] == "bytes_sent" or r["_field"] == "bytes_recv")

min_stat = stats
  |> min()
  |> toFloat()
  |> set(key: "stat", value: "min")
  |> group(columns: ["host"])
  |> pivot(rowKey:["host","stat"], columnKey: ["_field"], valueColumn: "_value")
  |> drop(columns: ["_start", "_stop", "_time"])

max_stat = stats
  |> max()
  |> toFloat()
  |> set(key: "stat", value: "max")
  |> drop(columns: ["_start", "_stop", "_time"])
  |> group(columns: ["host"])
  |> pivot(rowKey:["host","stat"], columnKey: ["_field"], valueColumn: "_value")
  |> drop(columns: ["_start", "_stop", "_time"])

mean_stat = stats
  |> mean()
  |> set(key: "stat", value: "mean")
  |> drop(columns: ["_start", "_stop", "_time"])
  |> group(columns: ["host"])
  |> pivot(rowKey:["host","stat"], columnKey: ["_field"], valueColumn: "_value")
  |> drop(columns: ["_start", "_stop", "_time"])

median = stats
  |> toFloat()
  |> quantile(q: 0.5)
  |> set(key: "stat", value: "median")
  |> drop(columns: ["_start", "_stop", "_time"])
  |> group(columns: ["host"])
  |> pivot(rowKey:["host","stat"], columnKey: ["_field"], valueColumn: "_value")
  |> drop(columns: ["_start", "_stop", "_time"])

union(tables: [min_stat, max_stat, mean_stat, median])
  |> group(columns: ["host"])
  |> sort(columns: ["host","stat"])
  |> yield()