start_time={{ START_TIME }}
end_time={{ END_TIME }}

stats = from(bucket: "telegraf")
  |> range(start: start_time, stop: end_time)
  |> filter(fn: (r) => r["_measurement"] == "mem")
  |> filter(fn: (r) => r["_field"] == "used_percent" or r["_field"] == "available_percent" or r["_field"] == "used" or r["_field"] == "available" or r["_field"] == "total" or r["_field"] == "free" or r["_field"] == "shared" or r["_field"] == "buffered" or r["_field"] == "cached" or r["_field"] == "swap_cached" or r["_field"] == "swap_total" or r["_field"] == "swap_free")

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
