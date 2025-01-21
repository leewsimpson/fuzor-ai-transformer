# Contributing to Fuzor-AI Transformer

We’re excited that you’re interested in contributing to **Fuzor-AI Transformer**! Whether you’re fixing bugs, adding features, or improving documentation, your efforts help enhance this project. To maintain a welcoming and collaborative environment, all contributors must adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting Bugs or Issues

Bug reports improve the project for everyone! Before opening a new issue, please [search existing ones](https://github.com/Deloitte-Australia/fuzor-ai-transformer/issues) to avoid duplicates. When ready to report, head to our [issues page](https://github.com/Deloitte-Australia/fuzor-ai-transformer/issues/new/choose) and use the provided template to ensure all relevant information is included.

> 🔐 **Security:** If you discover a security vulnerability, please report it via the [GitHub Security Advisories tool](https://github.com/Deloitte-Australia/fuzor-ai-transformer/security/advisories/new).

## Deciding What to Work On

Looking for a good starting point? Check out issues labeled [`good first issue`](https://github.com/Deloitte-Australia/fuzor-ai-transformer/labels/good%20first%20issue) or [`help wanted`](https://github.com/Deloitte-Australia/fuzor-ai-transformer/labels/help%20wanted). These are curated for new contributors and areas where help is needed.

Want to work on a new feature? Open a [feature request discussion](https://github.com/Deloitte-Australia/fuzor-ai-transformer/discussions/categories/feature-requests) to ensure it aligns with the project’s goals.

We also welcome contributions to our [documentation](https://github.com/Deloitte-Australia/fuzor-ai-transformer/tree/main/docs). Fix typos, improve guides, or create new resources—your input is invaluable!

## Development Setup

1. **VS Code Extensions**

    - When opening the project, VS Code will prompt you to install recommended extensions. Please accept these prompts.
    - Alternatively, manually install the extensions listed in the `.vscode/extensions.json` file.

2. **Local Development**

    - Install dependencies using `npm run install:all`.
    - Run tests locally with `npm test`.
    - Format your code before submission with `npm run format:fix`.

3. **Webview Development**
    - Navigate to `webview-ui` and install dependencies with `npm install`.
    - Start the webview UI with `npm start`. Changes to the UI are automatically applied during development.

## Writing and Submitting Code

To ensure your contributions are easily reviewed and integrated:

1. **Keep Pull Requests Focused**

    - Limit PRs to a single feature or bug fix.
    - Break larger changes into smaller, logical PRs.
    - Use clear and descriptive commit messages.

2. **Code Quality**

    - Follow TypeScript best practices and maintain type safety.
    - Run `npm run lint` to check for style issues.
    - Format your code with `npm run format`.

3. **Testing**

    - Add unit and integration tests for new features.
    - Ensure all tests pass locally with `npm test`.
    - Update existing tests if needed.

4. **Commit Guidelines**

    - Use the conventional commit format (e.g., `feat:`, `fix:`, `docs:`).
    - Reference related issues in your commits (e.g., `#123`).

5. **Before Submitting**

    - Rebase your branch on the latest `main`.
    - Ensure all CI checks pass.
    - Double-check your changes for any debug or unused code.

6. **Pull Request Description**
    - Clearly describe your changes.
    - Include steps to test the changes.
    - Highlight any breaking changes.
    - Attach screenshots for UI changes.

## Contribution Agreement

By submitting a pull request, you agree that your contributions will be licensed under the same license as the project ([MIT License](LICENSE)).

## Thank You!

Contributing to **Fuzor-AI Transformer** isn’t just about code—it’s about being part of a community shaping the future of AI-driven development. Let’s build something amazing together! 🚀

### Disclaimer

This doco is highly influenced by Cline
