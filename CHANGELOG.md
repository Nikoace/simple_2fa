# Changelog

## [0.3.0](https://github.com/Nikoace/simple_2fa/compare/simple-2fa-v0.2.0...simple-2fa-v0.3.0) (2026-04-01)


### Features

* enhance frontend UX with snackbar notifications and delete confirmation dialog, add backend secret validation, and improve error logging. ([3a414d8](https://github.com/Nikoace/simple_2fa/commit/3a414d8b5ff0771eb68e4f8e6808ed3e11d2ca78))
* frontend  refactor to react ([86d2f55](https://github.com/Nikoace/simple_2fa/commit/86d2f55c9df87ba58b35f52777b30d25236bf8c3))
* **frontend:** add i18n settings and multilingual UI ([156f514](https://github.com/Nikoace/simple_2fa/commit/156f5145452f51bbc52b5f7eb900a29460cb88dd))
* **frontend:** add i18n settings and multilingual UI ([7becb1b](https://github.com/Nikoace/simple_2fa/commit/7becb1b4d79e4993a4e394818b3dce75fe6851d8))
* **frontend:** add per-language CJK fonts ([00475de](https://github.com/Nikoace/simple_2fa/commit/00475de0c3f4e1e304ac4c701d0e40f284235f01))
* Implement robust TOTP secret validation with normalization and integrate into account creation and update API endpoints. ([13eaa79](https://github.com/Nikoace/simple_2fa/commit/13eaa79d3b252451537f526fb9d379d56831a963))
* Implement TypeScript for frontend, enhance backend secret handling, and add a secret leak test. ([e3550db](https://github.com/Nikoace/simple_2fa/commit/e3550db10146b0e25c2576c4afc1991e8993a380))
* Initialize simple 2FA application with FastAPI backend, SQLModel, TOTP logic, and a basic frontend. ([0a6c49c](https://github.com/Nikoace/simple_2fa/commit/0a6c49cce7cb441ae05ca4f424ece9ae37d73408))
* JetBrains Mono 字体 + 加密备份导出/导入 + 应用图标 (v0.2.0) ([a1f57fc](https://github.com/Nikoace/simple_2fa/commit/a1f57fc7689c1f21568b819befe1f3e5516d63a4))
* rewrite to Tauri 2 desktop application ([776d00b](https://github.com/Nikoace/simple_2fa/commit/776d00bfd7c1c6b39fe3dc9443c26d3b8a4383ad))
* **rust,frontend:** add JetBrains Mono font, encrypted backup export/import, and app icon ([386c60f](https://github.com/Nikoace/simple_2fa/commit/386c60ffadf0baca7aea05fe0477406c75ef0e61))


### Bug Fixes

* change bundle identifier from default com.tauri.dev ([093d297](https://github.com/Nikoace/simple_2fa/commit/093d2974e04f778d2a874e28cfaac13cd3110ac4))
* **frontend:** address PR review i18n dialog issues ([b55cc6b](https://github.com/Nikoace/simple_2fa/commit/b55cc6b06e34eecc0b03a8a99b58edad210ca678))
* **frontend:** fix import flow reset bug and selection reset on poll refresh ([55e65e2](https://github.com/Nikoace/simple_2fa/commit/55e65e2c6f951a22cc70c143ca41c39063100d16))
* **frontend:** replace Select with FormControl for improved accessibility ([9ebc2f1](https://github.com/Nikoace/simple_2fa/commit/9ebc2f1bf0e1cd2b910bee53884f003753a31f6a))
* **frontend:** unify header language selector style ([73f2380](https://github.com/Nikoace/simple_2fa/commit/73f23809ff53ddf5064d46f231292f7ec2f2e4af))
* remove duplicate 'Invalid secret:' prefix in error messages ([a08b489](https://github.com/Nikoace/simple_2fa/commit/a08b4891b8ba662886561e1f98a566295ad2280f))
* **rust,frontend:** atomic update, error handling for file dialogs, fix misleading test ([de735a6](https://github.com/Nikoace/simple_2fa/commit/de735a69ebcd720de89fac8fde8a2e75291ebb1b))
* Strip trailing Base32 padding in `normalize_secret` and add test… ([b173ae5](https://github.com/Nikoace/simple_2fa/commit/b173ae5d5b2a65ba9bd54f15f3d23e641b866c5f))
* Strip trailing Base32 padding in `normalize_secret` and add tests for correct TOTP generation with padded secrets. ([fe00a7a](https://github.com/Nikoace/simple_2fa/commit/fe00a7a172693e85e6eb01271251cc1abb852cdf))
* support short (80-bit) TOTP secrets ([6f17958](https://github.com/Nikoace/simple_2fa/commit/6f1795850cc4eec93d5d7fe3954fe83ee9e9eb8a))
* **ui:** eliminate progress bar refresh delay on TOTP expiry ([b1a7b85](https://github.com/Nikoace/simple_2fa/commit/b1a7b85ce06f4419454b32f5a5d17992ef80be71))
* use lenient base32 decoding for TOTP secrets ([cb740ca](https://github.com/Nikoace/simple_2fa/commit/cb740ca2a0d634cc763481ad55f335eb1fa610eb))
