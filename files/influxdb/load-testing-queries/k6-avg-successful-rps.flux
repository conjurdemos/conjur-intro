start_time={{ START_TIME }}
end_time={{ END_TIME }}

from(bucket: "k6")
  |> range(start: start_time, stop: end_time)
  |> filter(fn: (r) => r["_measurement"] == "http_reqs")
  |> filter(fn: (r) => r["_field"] == "value")
  |> filter(fn: (r) => r["expected_response"] == "true")
  |> group()
  |> drop(columns: ["_field", "scenario"])
  |> aggregateWindow(every: 1s, fn: count)
  |> mean()
