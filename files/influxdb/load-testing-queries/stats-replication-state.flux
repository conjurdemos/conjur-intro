start_time={{ START_TIME }}
end_time={{ END_TIME }}

state = from(bucket: "telegraf")
  |> range(start: start_time, stop: end_time)
  |> filter(fn: (r) => r["_measurement"] == "postgresql")
  |> filter(fn: (r) => r["_field"] == "state")
  |> yield()
