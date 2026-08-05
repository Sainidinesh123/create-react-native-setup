# Contributing to create-react-native-setup

Thanks for helping improve this **React Native CLI / project generator**.

## Development

```bash
git clone https://github.com/Sainidinesh123/create-react-native-setup.git
cd create-react-native-setup
npm install
npm test
```

Run the CLI locally:

```bash
node ./bin/create-react-native-setup.js MyApp --yes --dry-run
```

## Guidelines

1. **Do not break** existing CLI flags or prompt flow unless the change is intentional and documented in `CHANGELOG.md`.
2. Add or update **tests** under `test/` for behavior changes.
3. Keep commits focused; prefer clear messages (`fix:`, `docs:`, `feat:`).
4. For docs-only changes, update the relevant file under `docs/` and link from `README.md` when needed.
5. Be respectful — see [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## Pull requests

1. Fork and create a branch.
2. Run `npm test`.
3. Open a PR using the [pull request template](./.github/pull_request_template.md).
4. Describe **what** changed and **why**; note any user-facing docs updates.

## Reporting issues

Use [Bug report](./.github/ISSUE_TEMPLATE/bug_report.md) or [Feature request](./.github/ISSUE_TEMPLATE/feature_request.md) templates. Include CLI version, Node version, OS, and command line when possible.

## Security

See [SECURITY.md](./SECURITY.md). Do not open public issues for vulnerabilities that expose credentials or remote code execution.
