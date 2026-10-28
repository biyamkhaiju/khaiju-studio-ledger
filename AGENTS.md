<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep theme state in the root ThemeProvider and use global semantic tokens for both modes, so every module and dialog follows one preference.
- Do not implement database clients or migrations until the existing external connection is available and its schema has been inspected, to avoid parallel data systems and destructive assumptions.
