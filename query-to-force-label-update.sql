UPDATE resources SET replication_sets = array_append(resources.replication_sets, 'replication-set-1')
  WHERE resource_id in (select resource_id from replication_set_resources('replication-set-1'))
  AND NOT('replication-set-1' = ANY(resources.replication_sets));