start_time={{ START_TIME }}
end_time={{ END_TIME }}

from(bucket: "telegraf")
  |> range(start: start_time, stop: end_time)
  |> filter(fn: (r) => r["_measurement"] == "conjur_leader_health_replication_status_pg_stat_replication" or r["_measurement"] == "conjur_follower_health_replication_status_pg_stat_replication")
  |> filter(fn: (r) => r["_field"] == "sent_lsn_bytes" or r["_field"] == "replay_lsn_bytes")
  |> drop(columns: ["url"])
  |> aggregateWindow(every: 1s, fn: last, createEmpty: false)
  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> map(fn: (r) => ({ r with _value: r.replay_lsn_bytes / r.sent_lsn_bytes * 100.0 }))
  |> yield(name: "mean")
