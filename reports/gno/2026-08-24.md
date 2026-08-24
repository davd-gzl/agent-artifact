Verified by:
- [ ]  David
- [ ]  Ghost
- [ ]  Lours
- [ ]  Mikecito
- [ ]  zôÖma

**Quick Intro Context:**

---

From 17/08 to 24/08  **: Samourai crew**

> ⚠️ High priority · 🆕 New this week · ✅ Approved by a merger · 📥 Waiting for first review · 🚫 Don't merge · 💥 Merge conflict

## Gno Core (/gnolang/gno)

**⭐ Highlight**

- ✅ fix(gnovm): meter gas correctly for switch case - https://github.com/gnolang/gno/pull/5217 - davd-gzl
- 📥 docs: concise AI contract review guide follow-up - https://github.com/gnolang/gno/pull/5936 - davd-gzl
- fix(gnolang): allow indirect cur-call through a local func variable - https://github.com/gnolang/gno/pull/5689 - omarsy
- ✅ 💥 feat(gnovm): source-level gas profiler ("gas pprof") - https://github.com/gnolang/gno/pull/5967 - omarsy

---

**🛡️ PR Waiting for review (Security)**

- ⚠️ fix(gnokey): inject block height when not provided in ABCI requests - https://github.com/gnolang/gno/pull/5049 - davd-gzl
- ✅ fix(tm2/consensus): stop a proposer timing out on its own proposal - https://github.com/gnolang/gno/pull/6006 - davd-gzl
- fix(gnovm): include missing field in shallow size calculation + add overflow protection - https://github.com/gnolang/gno/pull/4892 - davd-gzl (expected conflict: gas)

---

**⚙️ PR Waiting for review (GnoVM / TM2)**

- fix(preprocess): avoid shadowing of iota - https://github.com/gnolang/gno/pull/5981 - Villaquiranm (AI: needs discussion)
- 📥 fix(gnovm): Add missing checks - https://github.com/gnolang/gno/pull/4886 - davd-gzl
- 📥 fix(autofile): halt writes on disk space exhaustion with auto-recovery - https://github.com/gnolang/gno/pull/5313 - davd-gzl
- 📥 fix(validators): handle duplicate validator entries in same block - https://github.com/gnolang/gno/pull/5478 - omarsy
- 📥 fix(gnovm): meter BigInt and BigDec comparison operators - https://github.com/gnolang/gno/pull/5646 - davd-gzl
- 📥 fix(gnolang): allow local type declarations in block statements - https://github.com/gnolang/gno/pull/5754 - davd-gzl
- 📥 fix(gnovm): fold -0 to +0 for float call args - https://github.com/gnolang/gno/pull/5864 - davd-gzl
- 🆕 📥 fix(gnovm): strip inherited directives from transpiled output - https://github.com/gnolang/gno/pull/6081 - omarsy
- 📥 feat(gnovm): add `vm/qlatestversion` query and soft version warnings for gnokey addpkg - https://github.com/gnolang/gno/pull/5380 - davd-gzl
- 🆕 📥 feat(gnovm): reject compiler and tooling directives in submitted packages - https://github.com/gnolang/gno/pull/6078 - omarsy
- 📥 refactor(gnovm): drop redundant TypeID recompute in DeclaredType.TypeID - https://github.com/gnolang/gno/pull/5991 - Villaquiranm
- 📥 test(tm2/store): cover the LastCommitID/Commit race - https://github.com/gnolang/gno/pull/5996 - davd-gzl
- 📥 💥 perf(gnovm): compute map keys once, and skip the redundant TypeID prefix for concrete key types - https://github.com/gnolang/gno/pull/6020 - Villaquiranm

---

**📖 PR Waiting for review (Documentation)**

- ✅ docs: add `make preview` target for the docs.gno.land frontend - https://github.com/gnolang/gno/pull/5752 - davd-gzl
- ✅ docs: fix grc20.NewToken examples that do not compile - https://github.com/gnolang/gno/pull/5993 - davd-gzl
- 📥 💥 docs: complete the effective-gno roadmap topics - https://github.com/gnolang/gno/pull/6000 - davd-gzl (changes requested)

---

**📦 PR Waiting for review (Packages)**

- feat(grc20reg): implement pagination - https://github.com/gnolang/gno/pull/5069 - davd-gzl
- 📥 feat(example): add `r/sys/security` dashboard realm - https://github.com/gnolang/gno/pull/5354 - davd-gzl (AI: needs discussion)
- 📥 💥 refactor(examples)!: drop the placeholder argument by keeping the realm off first - https://github.com/gnolang/gno/pull/6033 - davd-gzl

---

**🌐 PR Waiting for review (Gnoweb)**

- ✅ fix(gnoweb): follow-up fixes for the package overview page - https://github.com/gnolang/gno/pull/5934 - davd-gzl
- feat(gnoweb): make heading text clickable to set URL hash - https://github.com/gnolang/gno/pull/5585 - davd-gzl

---

**📂 PR Waiting for review (Other)**

- ✅ fix(valopers): validate auth-list members, sanitize description, reject negative min fee - https://github.com/gnolang/gno/pull/5874 - davd-gzl
- ✅ test(misc/e2e): add gnovm audit and e2e regression scripts - https://github.com/gnolang/gno/pull/5663 - louis14448
- 📥 fix(gnovm/stdlibs/strings): keep invalid UTF-8 bytes in Split, add tests - https://github.com/gnolang/gno/pull/5749 - davd-gzl (expected conflict: apphash)
- 📥 feat(stdlibs/bytes): port Cut, Clone, ContainsFunc, Buffer helpers - https://github.com/gnolang/gno/pull/5676 - davd-gzl (expected conflict: apphash)
- 📥 feat(stdlibs): port encoding/ascii85 and encoding/pem - https://github.com/gnolang/gno/pull/5679 - davd-gzl (expected conflict: apphash)

---

**🚧 PR In Progress — [Not approved by AI](https://github.com/samouraiworld/gno-agent-workspace/blob/main/reviews/README.md)**

- 📥 fix(tm2/rpc): validate WebSocket origin using `CORSAllowedOrigins` config - https://github.com/gnolang/gno/pull/5258 - davd-gzl
- 🆕 📥 fix(tm2): Parallel queries on localClient by mocking mutex on ro client - https://github.com/gnolang/gno/pull/6082 - Villaquiranm
- 📥 docs: rewrite gnokey into guide and reference, rename gnodev doc - https://github.com/gnolang/gno/pull/5873 - davd-gzl
- 📥 chore(perfs): Cache type-privacy checks across commits - https://github.com/gnolang/gno/pull/5923 - Villaquiranm
- 📥 perf(tm2/bptree): find the oldest and newest version with two seeks - https://github.com/gnolang/gno/pull/5979 - davd-gzl
- 📥 💥 feat: realm transaction sponsorship (PayGas + PayStorage) - https://github.com/gnolang/gno/pull/5382 - omarsy

---

**🚧 PR In Progress — Draft**

- ⚠️ 💥 feat(GovDAO): add activity page to highlight inactive GovDAO's members - https://github.com/gnolang/gno/pull/4731 - davd-gzl (AI: changes requested)
- ✅ 💥 fix(gnovm): recover from preprocessing panics on node restart - https://github.com/gnolang/gno/pull/5384 - davd-gzl (AI: needs discussion)
- fix(gnovm): meter GC traversal of large primitive-keyed maps - https://github.com/gnolang/gno/pull/5884 - omarsy
- fix(gnovm): make tryEvalStatic's error result meaningful - https://github.com/gnolang/gno/pull/5977 - omarsy
- fix(gnogenesis): stop fork test from reporting PASS on a rejected genesis - https://github.com/gnolang/gno/pull/5995 - davd-gzl
- fix(tm2/auth): stop the block gas price from climbing forever or panicking - https://github.com/gnolang/gno/pull/5999 - davd-gzl
- feat(stdlibs): port upstream additions Go 1.18-1.25 across 11 packages - https://github.com/gnolang/gno/pull/5753 - davd-gzl
- feat(examples): pluggable grc20 ledger storage + p/nt/hashmap (flat gas for large ledgers) - https://github.com/gnolang/gno/pull/5965 - omarsy
- perf(vm): lazily clone the type-check cache per transaction - https://github.com/gnolang/gno/pull/5901 - omarsy
- perf(gnovm): speed up DidUpdate per-write ownership hook - https://github.com/gnolang/gno/pull/5960 - omarsy (AI: changes requested)
- test(gnovm): bench the gas inputs a caller controls - https://github.com/gnolang/gno/pull/5994 - davd-gzl
- docs: add oracles resource page - https://github.com/gnolang/gno/pull/6007 - davd-gzl
- 💥 fix(gnovm): respect type identity in assignability - https://github.com/gnolang/gno/pull/5785 - omarsy
- 💥 fix(gnovm): depth-based shadowing for promoted struct fields and methods - https://github.com/gnolang/gno/pull/5820 - omarsy
- 💥 feat(govdao): add proposal fee-based for non-member - https://github.com/gnolang/gno/pull/4944 - davd-gzl (AI: changes requested)
- 💥 feat(vm): control namespace enforcement via sysnames_pkgpath VM param - https://github.com/gnolang/gno/pull/5080 - davd-gzl (AI: changes requested)
- 💥 feat(gnovm): add per-type GC allocation tracking in debug builds - https://github.com/gnolang/gno/pull/5437 - omarsy (AI: changes requested)
- 💥 feat(gnoweb): add `:::details` collapsible block - https://github.com/gnolang/gno/pull/5593 - davd-gzl
- 💥 WIP: feat(gnovm): add gas metering for go native fn - https://github.com/gnolang/gno/pull/5619 - davd-gzl
- 💥 WIP feat(gnovm): add math/big stdlib (Int subset) - https://github.com/gnolang/gno/pull/5678 - davd-gzl (AI: needs discussion)
- 💥 feat(gnodev): auto-import the dev key into the local keybase - https://github.com/gnolang/gno/pull/5680 - davd-gzl (AI: needs discussion)
- 💥 feat(tm2/std,gnovm): drop _filetest.gno suffix requirement - https://github.com/gnolang/gno/pull/5712 - davd-gzl (AI: changes requested)
- 💥 docs: add cheat sheet page - https://github.com/gnolang/gno/pull/5551 - davd-gzl (AI: changes requested)
- 🚫 fix(consensus): implement `RemovePeer` cleanup - https://github.com/gnolang/gno/pull/5231 - davd-gzl (AI: changes requested)

---

**🐛 Issues Opened:**

- tm2 ABCI queries: drop the per-call mutex for the read-only client to accomplish concurrent queries - https://github.com/gnolang/gno/issues/6077 - Villaquiranm

---

**🎉 PR Merged**

- fix(preprocess): map composite-literal keys resolution inside for loop - https://github.com/gnolang/gno/pull/6037 - Villaquiranm
- fix(gnovm): correct GotoJump stmt-stack truncation for goto out of nested loops - https://github.com/gnolang/gno/pull/5963 - omarsy
- fix(gnovm): pin the per-file Go version in the consensus type-check - https://github.com/gnolang/gno/pull/5978 - davd-gzl

---

**📚 Docs site (/gnolang/docs.gno.land)**

- fix: link out of the docs folder to the monorepo on GitHub - https://github.com/gnolang/docs.gno.land/pull/76 - davd-gzl

---

**🖥️ Validators / Infrastructure Tools:**

- 💥 Feat/report bft margin - https://github.com/samouraiworld/gnomonitoring/pull/113 - louis14448

Merged:
- Fix/govdao rejected proposals - https://github.com/samouraiworld/gnomonitoring/pull/134 - louis14448

---

**📝 NOTE:**
