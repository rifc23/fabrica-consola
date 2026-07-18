# Diagnóstico MCP GitHub — 2026-07-18

Diagnóstico puntual (sesión de una sola vez, no repetir). Objetivo: entender por qué
`search_repositories` del MCP de GitHub no encuentra `rifc23/calculadora` (existe, es privado,
tiene el topic `fabrica-agentes` puesto vía API con PAT). A continuación las 6 pruebas ejecutadas
EN ORDEN, con el output crudo de cada una, sin interpretar.

---

## Prueba 1 — Herramientas de GitHub disponibles (vía ToolSearch)

Búsquedas ejecutadas: `search_repositories github repository search`, `add_repo list_repos
claude-code-remote`, `get_repo repository read github`, `add_repo list_repos register_repo_root
claude code remote session`, `get_file_contents get repository content github`.

Herramientas de GitHub (`mcp__github__*`) encontradas, con sus nombres exactos:

- `mcp__github__search_repositories`
- `mcp__github__create_repository`
- `mcp__github__fork_repository`
- `mcp__github__list_repository_collaborators`
- `mcp__github__search_code`
- `mcp__github__search_commits`
- `mcp__github__search_issues`
- `mcp__github__search_pull_requests`
- `mcp__github__search_users`
- `mcp__github__actions_list`
- `mcp__github__actions_get`
- `mcp__github__issue_read`
- `mcp__github__pull_request_read`
- `mcp__github__resolve_review_thread`
- `mcp__github__unresolve_review_thread`
- `mcp__github__add_issue_comment`
- `mcp__github__create_branch`
- `mcp__github__get_file_contents`
- `mcp__github__get_commit`
- `mcp__github__get_latest_release`
- `mcp__github__get_release_by_tag`
- `mcp__github__get_tag`
- `mcp__github__get_job_logs`
- `mcp__github__list_branches`
- `mcp__github__list_commits`
- `mcp__github__list_issue_fields`

Vía el listado de herramientas ya cargadas al inicio de la sesión (no ToolSearch), también
disponibles del servidor **Claude_Code_Remote**:

- `mcp__Claude_Code_Remote__add_repo`
- `mcp__Claude_Code_Remote__list_repos`
- `mcp__Claude_Code_Remote__register_repo_root`
- `mcp__Claude_Code_Remote__create_trigger`
- `mcp__Claude_Code_Remote__delete_trigger`
- `mcp__Claude_Code_Remote__fire_trigger`
- `mcp__Claude_Code_Remote__list_environments`
- `mcp__Claude_Code_Remote__list_triggers`
- `mcp__Claude_Code_Remote__subscribe_pr_activity`
- `mcp__Claude_Code_Remote__unsubscribe_pr_activity`
- `mcp__Claude_Code_Remote__update_trigger`

Tras un system-reminder posterior (deferred tools), aparecieron además como disponibles vía
ToolSearch (no todas cargadas todavía en ese momento):
`mcp__github__actions_run_trigger`, `mcp__github__add_comment_to_pending_review`,
`mcp__github__add_reply_to_pull_request_comment`, `mcp__github__create_or_update_file`,
`mcp__github__create_pull_request`, `mcp__github__delete_file`,
`mcp__github__disable_pr_auto_merge`, `mcp__github__enable_pr_auto_merge`,
`mcp__github__get_check_run`, `mcp__github__get_me`, `mcp__github__get_team_members`,
`mcp__github__get_teams`, `mcp__github__issue_write`, `mcp__github__list_issue_types`,
`mcp__github__list_issues`, `mcp__github__list_pull_requests`, `mcp__github__list_releases`,
`mcp__github__list_tags`, `mcp__github__merge_pull_request`,
`mcp__github__pull_request_review_write`, `mcp__github__push_files`,
`mcp__github__request_copilot_review`, `mcp__github__run_secret_scanning`,
`mcp__github__sub_issue_write`, `mcp__github__subscribe_pr_activity`,
`mcp__github__unsubscribe_pr_activity`, `mcp__github__update_pull_request`,
`mcp__github__update_pull_request_branch`.

No se encontró ninguna herramienta `get_repo` (singular) del servidor `github` — el equivalente
más cercano es `mcp__github__get_file_contents` (lee contenido/árbol de un repo dado owner/repo).

---

## Prueba 2 — `search_repositories` con `user:rifc23 topic:fabrica-agentes`

Llamada:
```
mcp__github__search_repositories({ query: "user:rifc23 topic:fabrica-agentes", minimal_output: false })
```

Resultado crudo:
```json
{"total_count":0,"incomplete_results":false}
```

---

## Prueba 3 — `search_repositories` con `repo:rifc23/calculadora`

Llamada:
```
mcp__github__search_repositories({ query: "repo:rifc23/calculadora", minimal_output: false })
```

Resultado crudo (error):
```
failed to search repositories with query 'repo:rifc23/calculadora': GET https://api.github.com/search/repositories?page=1&per_page=30&q=repo%3Arifc23%2Fcalculadora: 422 Validation Failed [{Resource:Search Field:q Code:invalid Message:The listed users and repositories cannot be searched either because the resources do not exist or you do not have permission to view them.}]
```

---

## Prueba 4 — `add_repo` sobre `rifc23/calculadora`

Llamada:
```
mcp__Claude_Code_Remote__add_repo({ owner: "rifc23", repo: "calculadora" })
```

Resultado crudo (error):
```
add_repo: repository "rifc23/calculadora" was not found on github.com, or this session's GitHub credential doesn't have access to it. Check that the owner/repo are correct (e.g. "anthropics/claude-code", not a path inside a monorepo). Detail: you don't have access to rifc23/calculadora
```

---

## Prueba 5 — `get_file_contents` directo sobre `rifc23/calculadora`

Llamada:
```
mcp__github__get_file_contents({ owner: "rifc23", repo: "calculadora", path: "/" })
```

Resultado crudo (error):
```
Access denied: repository "rifc23/calculadora" is not configured for this session. Allowed repositories: rifc23/fabrica-consola
```

---

## Prueba 6 — Herramienta de listado de repos "conectados"/disponibles en esta sesión

Búsqueda ToolSearch ejecutada: `list connected repositories session sources available` — no
apareció ninguna herramienta adicional dedicada a listar "repos conectados" más allá de
`mcp__Claude_Code_Remote__list_repos` (ya disponible sin ToolSearch desde el inicio de la sesión).

Llamada:
```
mcp__Claude_Code_Remote__list_repos({ query: "" })
```

Resultado crudo:
```json
{"repos":[{"full_name":"rifc23/fabrica-consola","url":"https://github.com/rifc23/fabrica-consola","pushed_at":"2026-07-18T22:19:20Z","visibility":"public","can_push":true},{"full_name":"rifc23/crm-grecia-fire","url":"https://github.com/rifc23/crm-grecia-fire","pushed_at":"2026-07-18T21:22:20Z","visibility":"private","can_push":true},{"full_name":"rifc23/fabrica-agentes-template","url":"https://github.com/rifc23/fabrica-agentes-template","pushed_at":"2026-07-18T15:39:49Z","visibility":"private","can_push":true}],"has_more":false}
```

Nota: `rifc23/calculadora` NO aparece en esta lista (`has_more: false`, o sea no es un tema de
paginación).

Para referencia cruzada, el mensaje de error crudo de la Prueba 5 también declaró explícitamente
el scope de la sesión: `Allowed repositories: rifc23/fabrica-consola` (singular — ni siquiera
incluye los otros dos repos que sí aparecen en `list_repos`).

---

## Fin del diagnóstico

Sin interpretación adicional por instrucción de la tarea — las 6 pruebas y sus outputs crudos
quedan documentados arriba tal como se ejecutaron y recibieron.
