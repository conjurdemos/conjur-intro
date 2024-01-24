start_time={{ START_TIME }}
end_time={{ END_TIME }}

stats = from(bucket: "telegraf")
  |> range(start: start_time, stop: end_time)
  |> filter(fn: (r) => r["_measurement"] == "mem")
  |> filter(fn: (r) => r["_field"] == "used_percent")
  |> derivative(unit: 10s)
  |> yield()
