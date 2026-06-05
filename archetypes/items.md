---
schema_version: "archivej.item.v0.1"
item_id: ""
slug: "{{ .Name }}"

# Timestamps (Codex must update on edit)
created_at: "{{ now.Format \"2006-01-02T15:04:05Z07:00\" }}"
updated_at: "{{ now.Format \"2006-01-02T15:04:05Z07:00\" }}"

# Standardized date format (YYYY-MM-DD)
date: "{{ .Date.Format \"2006-01-02\" }}"
date_original: ""

public_access_status: false
acquisition_transfer: ""

level:
  rg: ""
  series: ""
  file_number: ""
  local_identifier: ""
  file_note: |-
    ""

title: "{{ replace .Name \"-\" \" \" | title }}"
summary: ""

description_status: ""

venues: []
sources: []
creators: []
subjects: []
tags: []

shotlist: |-
  ""

media:
  type: "video"
  embed_url: ""
  # components: original media objects (files/URLs) for this item
  components: []
  # thumbnail: representative image for the item (URL or path)
  thumbnail: ""

timecodes_note: |-
  ""
draft: true
---
