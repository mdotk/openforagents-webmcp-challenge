# WORLDLINE asset provenance

Date: 3 September 2026.

The two visual assets in `public/worldline/` were created for this challenge
candidate with OpenAI's built-in image generation tool. They are fictional and
do not reproduce a real mission, spacecraft, film frame, game, company or
scientific visualization.

## Normalized generation briefs

The space background used this art direction:

> Create a wide cinematic deep-space scene for an interactive educational web
> experience. Place a luminous black hole and accretion distortion on the far
> left and a small, recognisable Earth on the far right. Keep the middle open
> for a spacecraft and overlaid worldline paths. Use realistic astronomical
> light, deep black space and sparse stars. Include no spacecraft, interface,
> text, logos, brands, film references or watermark.

The spacecraft used this art direction:

> Create one fictional deep-space probe in a three-quarter side view with a
> parabolic communications dish, compact metallic body, small antennae and a
> restrained blue-violet instrument light. Isolate the entire probe against a
> flat chroma-green background with no shadow, text, logo, brand, scenery or
> watermark.

The probe background was removed locally. Both assets were stripped and
converted to WebP. The generated originals remain outside Git in the Codex
image-generation directory and in the bounded local source-custody directory
listed below.

## Custody and identity

| Shipped asset | Generated source | Source SHA-256 | Shipped SHA-256 |
| --- | --- | --- | --- |
| `space-background.webp` | `exec-c045ee94-deda-4511-853e-f4928f555d3b.png` | `5b1df33ab9717461230abd51df79fbad6336ab90fc8d776378c02f7be711408b` | `decabb3d7b3302f294d34ef909eac7c49ae18dcbca28c64dee7944b9a691381a` |
| `probe.webp` | `exec-906f3566-4828-4f98-9910-686cc0bd8ac2.png` | `192bd83af68f8e052904388f4e41a663212979d6a22e71d6beb2f072f89ecba4` | `2f3ed2a5f9b4d1874a5517ebb3971423e69835a4590229039fcb1c2c840f0eb7` |

Generated originals:

`/Users/matt/.codex/generated_images/01a045b9-2bb4-7873-ba73-1323fd9382fb/`

Bounded local source custody, including the chroma-key intermediate:

`/Volumes/Dev/CodexScratch/worldline-source-assets-20260903/`

That local custody directory is not required to build or run the project and
may be removed after the final challenge evidence is accepted.
