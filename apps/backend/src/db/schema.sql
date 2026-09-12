CREATE TABLE IF NOT EXISTS events (
  ts DateTime64(3),
  move_id String,
  actor_id String,
  actor_type LowCardinality(String),
  event_type LowCardinality(String),
  box_id String DEFAULT '',
  item_id String DEFAULT '',
  discrepancy_id String DEFAULT '',
  utterance String DEFAULT '',
  payload String DEFAULT '{}'
) ENGINE = MergeTree ORDER BY (move_id, ts);

CREATE TABLE IF NOT EXISTS moves (
  move_id String,
  customer_name String,
  address String,
  move_date Date,
  status LowCardinality(String),
  survey String,
  customer_token String,
  packer_token String,
  customer_chat_id String DEFAULT '',
  updated_at DateTime64(3)
) ENGINE = ReplacingMergeTree(updated_at) ORDER BY move_id;

CREATE TABLE IF NOT EXISTS boxes (
  move_id String,
  box_id String,
  room String,
  fragile UInt8,
  high_value UInt8,
  status LowCardinality(String),
  packer_id String,
  updated_at DateTime64(3)
) ENGINE = ReplacingMergeTree(updated_at) ORDER BY (move_id, box_id);

CREATE TABLE IF NOT EXISTS items (
  item_id String,
  move_id String,
  box_id String,
  name String,
  name_norm String,
  fragile UInt8,
  updated_at DateTime64(3)
) ENGINE = ReplacingMergeTree(updated_at) ORDER BY item_id;

CREATE TABLE IF NOT EXISTS discrepancies (
  discrepancy_id String,
  move_id String,
  item_name String,
  description String,
  state LowCardinality(String),
  survey_match String DEFAULT '',
  photo_url String DEFAULT '',
  assessment String DEFAULT '{}',
  packer_confirmed UInt8 DEFAULT 0,
  decision String DEFAULT '',
  decided_by String DEFAULT '',
  telegram_message_id String DEFAULT '',
  updated_at DateTime64(3)
) ENGINE = ReplacingMergeTree(updated_at) ORDER BY discrepancy_id;
