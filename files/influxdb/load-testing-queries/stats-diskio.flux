start_time={{ START_TIME }}
end_time={{ END_TIME }}

stats = from(bucket: "telegraf")
  |> range(start: start_time, stop: end_time)
  |> filter(fn: (r) => r["_measurement"] == "diskio")
  |> filter(fn: (r) => r["_field"] == "read_time" or r["_field"] == "reads" or r["_field"] == "write_bytes" or r["_field"] == "write_time" or r["_field"] == "weighted_io_time" or r["_field"] == "writes" or r["_field"] == "read_bytes" or r["_field"] == "merged_writes" or r["_field"] == "merged_reads" or r["_field"] == "iops_in_progress" or r["_field"] == "io_time")

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
