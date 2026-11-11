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

- Inventory UI uses a mode-selecting adapter over isolated local IndexedDB and authorized TanStack server functions; remote errors must never silently become local writes.
- Neon access uses the official connector transport; its fail-closed placeholder remains disabled until an actual project connection is linked, preventing speculative credential use.
- All remote inventory operations enforce a server-verified encrypted HttpOnly shared-key session before repository or storage access; key rotation invalidates existing sessions.
- Public catalog existence is checked globally before applying filters; only unconfigured or globally empty inventory allows illustrative fallback, never an outage or a filtered empty result.
- Photo originals and derived crops are separate immutable S3 objects; reference checks precede object deletion to protect active galleries.
