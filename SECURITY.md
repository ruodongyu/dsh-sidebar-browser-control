# Security and privacy

This is a third-party desktop plugin with access to the current DSH session's visible native webviews. Treat it as software with browser access.

- The bridge binds only to 127.0.0.1 on an OS-assigned port. Host and Origin checks reject foreign browser origins; renderer commands require a random per-start bearer token.
- Port/token discovery goes through DSH's authenticated API route. The former public-origin `/connect` token-minting endpoint has been removed.
- Local diagnostics require a separate random bearer token stored in the active profile's `.sidebar-browser-control/control.json`. A process that can read this file can control the browser. The plugin does not isolate malicious programs running as the same OS user. POSIX file mode does not constitute a Windows ACL boundary.
- The demonstration page is public on the loopback bridge and contains no personal information or command API. Only this exact built-in URL is automatically interactive.
- Other pages require a user click to enable interaction. Navigation or reload clears the grant. This is an accident-prevention control, not a sandbox against another privileged plugin.
- Tool descriptions require user authorization for sending, purchasing, deleting, and similar consequential actions. The plugin cannot infer the business consequence of every DOM click; model/provider approval settings remain relevant.
- Page text is untrusted input. Fixed DOM operations are used; there is no model-facing arbitrary JavaScript tool. Password and file inputs are refused. Screenshots and page text can still contain personal information visible on screen.
- Screenshots are local, subject to count/size retention, and are not uploaded by this plugin. Reading them with a model may send their contents to that model provider.
- Runtime files, diagnostic credentials, screenshots, profile backups and personal verification results must never be committed. The repository and npm package use allowlisted content.

Do not post credentials, private screenshots or profile dumps in public issues. Report vulnerabilities privately through [GitHub private vulnerability reporting](https://github.com/ruodongyu/dsh-sidebar-browser-control/security/advisories/new).
