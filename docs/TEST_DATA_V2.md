# Structured Test Data Generator V2

Existing UTIL-03, `/tools/test-data-generator/`, gains Structured datasets alongside unchanged Lorem/synthetic text and cryptographic EAN/GTIN utilities. No new dependency, backend, storage or remote corpus. Types and generators are pure TypeScript; one dedicated worker per explicit generation provides real cancellation/deadline. UI is lazy-loaded with the existing tool workspace.

## Schema and deterministic data

Up to5 named collections,24 ordered fields each,5000 rows per collection /10000 total. Fields have stable UI IDs, own names, type, generated/fixed scalar mode, required/optional, nullable and uniqueness policies. Supported types: ASCII synthetic strings (1–256characters, optional ASCII prefix), safe integer, decimal (0–4 places, bounds within±1billion), boolean,UUIDv4,UTCISO date/datetime,distinct-line enum, numeric EAN13/GTIN14 strings,null and a one-to-many reference. Fixed strings/enums support Unicode. Fixed values are explicit JSON scalars; incompatible types reject. No implicit numeric conversion of GTINs.

Seeds are reproducible test-data PRNG input, not security randomness. Blank seed takes a fresh Web Crypto seed; the actual seed appears with the result for reproduction. Existing standalone GTIN utility continues using its original Web Crypto sampling. Structurally valid GTINs for testing only. Valid checksum does not imply GS1 assignment or identification of a real product.

Generated optional fields omit approximately10%; nullable fields use approximately10% null. Required means the key is present; nullable independently allows null. Unique checks ignore omitted/null entries but prevalidate full requested finite cardinality conservatively. Small finite integer/decimal/boolean/enum/date/string/GTIN spaces use deterministic offset sequences for unique values, avoiding retry exhaustion. UUID uniqueness is checked before accepting the atomic result. No partial successful output after an impossible schema.

## Collections and relationships

Customers, related orders, products, paginated API response and inventory presets are editable local examples. A reference names a collection ID and unique field ID. The target must be required/non-null/unique. The engine topologically sorts dependencies, rejects missing references or cycles, generates parents first and samples only actual generated keys. Referencing fields are required/non-null/nonunique (many children may share a parent). Duplicate IDs/names and prototype-bearing structural names reject. Removing a referenced collection reports an error on generation; it does not silently fabricate replacement keys.

## Outputs, budgets and privacy

JSON is a single array, an object of named related collections or `{content,page:{number,size,totalElements,totalPages}}`. Multiple collections require the related envelope so none disappear silently. CSV exports one selected flat collection, in declared field order. Every cell/header is quoted with doubled quotes and CRLF record separators; values whose first non-whitespace/control character is `=`, `+`, `-` or `@` receive a leading apostrophe to prevent spreadsheet formula interpretation. This CSV-only transformation can make negative numeric cells textual; original JSON is unchanged. Null/omitted CSV cells are blank.

4MiB maximum serialized JSON or each collection CSV; incremental row budget prevents uncontrolled intermediate allocation.2second terminating worker deadline. Preview:10rows/page and16000UTF16 units of code; full bounded copy/download remains explicit. Input/schema/result edits invalidate old output; errors preserve configuration, Reset clears results and returns to the initial customer preset. Nothing is automatically saved, including custom schema or seed.

## Verification and observed latency

24 focused unit cases cover presets, all types/checksums/leading zeros, seed equivalence, ranges, finite uniqueness, foreign keys/order/cycles, unsafe names, Unicode/fixed values, CSV injection/escaping, null/omission and budgets/transactional rejection. Two real browser flows cover schema controls, foreign keys, exact clipboard/download bytes, CSV protection, invalid uniqueness, reset/reload, both themes at390/768/1440 and storage/network/console/URL privacy. Observed Windows Chromium click-to-result-enabled latency is recorded in `screenshots/actual/v22-dataset-performance.json` for20/1000/5000 rows; these are driver-inclusive observations, not pure generation timings or universal guarantees.

P2 / intentional scope: no ORM, SQL execution/INSERT generation, nested object schemas, remote names, template persistence, arbitrary scripting or date dependencies across fields. Physical devices and expanded cross-browser/assistive-technology QA remain unverified. Large aggregate schemas can exceed the byte budget before reaching the row maximum and then fail honestly.
