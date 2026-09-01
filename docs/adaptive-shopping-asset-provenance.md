# Adaptive Shopping Canvas asset provenance

Date: 1 September 2026.

All thirteen visible product assets in `public/shopping/` are fictional catalogue packshots generated for this challenge candidate with OpenAI's built-in image generation tool. They are not scraped retailer images and do not depict real products, brands, inventory or customers.

## Normalized generation brief

The individual image calls used a shared art direction, normalized here for reproducibility:

> Create one isolated high-end fictional retail catalogue product as a clean front or three-quarter packshot. Show the complete object, centered and evenly studio-lit, with no model, mannequin, logo, label, price, text, scenery or unrelated object. Use a transparent background and a square composition suitable for an exact-product styling canvas. Preserve the specified garment or accessory shape, material and color.

Each call substituted the exact product named below. The generated PNG was resized to a 900 x 900 WebP while preserving transparency. No product was composited onto a person and no generated image is presented as evidence of fit, drape, live stock or a real retailer listing.

## Source custody and product mapping

The original PNGs remain outside Git in:

`/Users/matt/.codex/generated_images/01a045b9-2bb4-7873-ba73-1323fd9382fb/`

| Canonical asset | Generated source | Source SHA-256 | Shipped SHA-256 |
| --- | --- | --- | --- |
| `midnight-column-dress.webp` | `exec-3c1f4a7a-eddc-407d-88f2-27e33c1e50c9.png` | `573cb83d7a02c0354876ca5af5e1199a632793120ff26eeff294e67f7f358830` | `83252dc180845f2bc9c8be69bc02f928ce8b805feee55c94db8a1ec613f11d7d` |
| `ink-satin-jumpsuit.webp` | `exec-cc5e54e1-d5c1-4999-be63-cff9cf2b2857.png` | `2a1fb783978390621fb286a09f4fa24d397c9696e3aa65fb92ff719ef208276a` | `f4183937517da8b33cb2223fcd0ef1d153d1b255b64c4d12f8064c99e3dd1223` |
| `oxblood-slip-dress.webp` | `exec-633d8123-f529-4960-9500-2ddc450a0be8.png` | `4cf7d31c81189b130c9ef69efaeae6c099b2631297eec0e6f62170244482a245` | `749aa4e6c2b48bc9b9f6efbd4b81c5df232ecf03cf6f94c719ffb4a7a3a6639f` |
| `silver-cropped-blazer.webp` | `exec-ae343e41-168a-4600-b7c0-5fcd3dc86298.png` | `77731da54784aa4b0f9d7ffd618d21ec54815b64336756810bd4fd8d3ecb0d58` | `77cd634fcb77ac834a14f7bb186e0213ec344c964945b2d4c2fc00301625c4b6` |
| `ink-sculpted-jacket.webp` | `exec-1ab1ff81-682c-44bd-97e7-f47dcda59e12.png` | `4e7746bd5aba6e6c83a5152a50db302fdf0c3e5b9ad114c1d7f578743088092e` | `386be6e4144c7abbc0ba8737ba1c310b4d87ad7217fce46273e2f4904f7c1214` |
| `noir-longline-blazer.webp` | `exec-df2d3860-24c6-4219-9eec-5b97e4537284.png` | `262dc205e1a451603ba47a80e1865b7c2f0c0831686b66da86332798e1e090a8` | `517279db88c5fc258dfca6637e53558de084c8a2cf0e74a53f58f8928c02255e` |
| `graphite-frame-bag.webp` | `exec-572e0b53-0bc8-4551-87fd-195219bc146d.png` | `96b874307241793179dfb0f3203bc122fc2c23deba30e0ab6eb1e4851a195d2f` | `6fd18f160d126bbff5c7fd5a20be0a9dcece283edbca7e4678fc307825d07546` |
| `ink-slim-clutch.webp` | `exec-3221be64-3e97-4097-a517-b39fc20f1018.png` | `5c246dc95bee4ceca3699cf4e4a0ed71fc2d78c3c95bc1a42c17d223647ad5a3` | `ada1e2413c922a05b1c7212c967c0e667da2a409cee10e16095b8c27c5960192` |
| `oxblood-mini-bag.webp` | `exec-3fa86c42-f151-4003-a0a6-0cc54153c04e.png` | `20bb170292fc706c4f1cb4bfa18dd0af6555b10eb2cb13245748868315460f82` | `f53a117564c47dca2c16f3bbbee6fa561656bb67eeb7919141cd42ecdcd46a94` |
| `silver-chain-belt.webp` | `exec-a3c4285d-0961-4e19-8b84-039479fd25ac.png` | `9c397cf3ac3da58f118c16d1131f9a2e8de53ef37589e4fda6f7502dd7fd4841` | `2dd1db5014ca057e1a33f54c89cc38deaf77b6cf6ee5f237b2b47c3bdd06dcf1` |
| `architectural-earrings.webp` | `exec-c413607d-4c67-4c55-a121-d818695429dc.png` | `8a3ba370d4dfe0ae58384912026e0cfe2ed0cdaae4a079f32fb4ed1af1ac7fcd` | `fb7f98f93c737e95ddd0f1c0aef370777dad957908f7500d87cf438780648e9b` |
| `oxblood-silk-scarf.webp` | `exec-4ebf7a22-06ee-440b-89ea-2f1f325048fb.png` | `2c54905c84f460c57558bf8c2e5f6f740b22004dd46592f03a17745dc198fac4` | `44054fb8a656304700edb17491bd54134176c6509f640cb6dde322e04479fba8` |
| `owned-blue-boots.webp` | `exec-3f4b5941-ef22-40fc-9d62-c667c69a7558.png` | `1af343df2c1d2b91e28e5a88c46744d2901cee13b12376bc5f3218198266369d` | `e1753b4b5642ca2f8c8d8550ea8e532aa2fe60f0ebcc570d009929ee40031a5a` |

The catalogue in `src/domain/shopping.ts` is the authoritative mapping from every retailer color SKU to its exact shipped asset. Size variants share the color-SKU asset where appropriate. The owned boots use the separate owned-item record and never appear as a retailer variant or cart line.
