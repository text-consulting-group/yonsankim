---
title: "Building an English Layer for the YongsanKim Archive"
date: 2026-06-07
draft: false
author: archiveJ editorial team
summary: "A field note on how the YongsanKim archive began to open an English-facing layer without breaking the Korean research structure, exhibition flow, or synchronized item corpus."
categories:
  - articles
tags:
  - localization
  - multilingual
  - archive design
  - exhibition
translationKey: building-an-english-yongsankim-archive
components:
  - /img/home-rg111-aerial.jpg
---

The YongsanKim archive did not begin as a bilingual website. It began as a Korean research corpus built around synchronized items, exhibition sections, and interpretive documents. That starting point matters, because the English layer could not simply be added as a set of translated labels. It had to be designed so that the archive would remain stable while opening a second reading path.

The first rule was simple: Korean remains the base language. The project structure, public routes, and synchronized item corpus were all already organized around the Korean archive. Rather than replacing that base, the English layer was treated as a companion structure. This made it possible to preserve the logic of the existing archive while gradually extending it for new readers.

That decision immediately shaped the document workflow. The archive distinguishes between working documents and public documents. Research writing begins in the `archivej/research` folder, while public pages such as `/document/` and `/research-guide/` are synchronized outputs. In a multilingual setting, that means both the source layer and the public layer need language pairs. The English archive is therefore not just a translated front-end; it requires its own document maintenance logic.

The second rule concerned exhibitions. The Yongsan exhibition structure is not a generic gallery of items but a seven-section sequence built from the curated corpus of `2. 미군기지와 도시산책`. Because each section already depended on place names, map markers, section titles, and item blocks, multilingual work had to separate internal identifiers from display language. In practice, that meant keeping Korean place titles as the structural anchor while adding English-facing labels for interface display. The map system could continue to work, while the English visitor could still read the exhibition in a coherent way.

The third rule concerned item metadata. Not every field should be translated, and not every field should be translated automatically. In this archive, `description` may contain OCR text, back-of-photo captions, or research notes. Treating that field as if it were a clean translation surface would damage the corpus. So the English layer began instead with a smaller set of display-oriented fields:

- `title_en`
- `summary_en`
- `description_en`

Even here, the policy remained conservative. If a title was already in English, it could be reused. If OCR was already English, it could be copied into `description_en`. If the image context clearly suggested a readable English summary, `summary_en` could be generated. But Korean OCR was not mechanically translated into archival truth. That distinction matters, because the English layer is meant to support access, not overwrite the evidentiary status of the source material.

This is also why the archive adopted a selective visibility policy for English readers. Not everything that is useful inside a Korean working corpus is equally useful in the first English browsing experience. QR-code support layers, upload-oriented materials, and automated text-caption outputs can be important internally, but they often act as noise when an English visitor first opens `/en/items/` or `/en/search/`. Rather than deleting them, the archive now hides them from the English browsing entrance while keeping their direct URLs intact. The principle is curatorial, not destructive.

In other words, the English layer is being built as a reading interface, not a second archive detached from the first one. It opens pathways through the same materials, but it does so carefully: one document pair at a time, one exhibition section at a time, one item field at a time.

That measured pace is part of the design. The archive does not need every sentence to become English at once in order to become legible. It needs stable entry points. That is why the early phases focused on `/about/`, `/document/`, `/research-guide/`, `/exhibition/`, and representative item pages. These are the pages that establish trust, explain method, and show how the archive should be read.

The remaining work is still substantial. Exhibition section peers in English must continue to improve. Representative item titles and summaries need manual refinement where automatic phrasing is too thin. Some item groups should remain searchable but visually subordinate. And the long-term document workflow will eventually need explicit English source documents rather than only synchronized public outputs.

Still, the structure is now in place. The archive has moved from a Korean-only corpus toward a multilingual design system. That shift is not only technical. It changes who can enter the project, how they orient themselves, and what kind of public reading the archive can support.

If the Korean archive asked how Yongsan was documented, occupied, and reinterpreted, the English layer adds a new question: how can those same materials be opened to another language without flattening their original structure?

Related pages

- `/en/document/`
- `/en/research-guide/`
- `/en/exhibition/`
- `/en/items/`
