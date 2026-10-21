# Contribuer / Contributing

## Français

Proposez une modification qui résout un problème précis : reproduction d’un défaut, contrôle plus fiable, documentation FR/EN, accessibilité ou fiche d’outil correctement sourcée. Une contribution peut être petite et utile.

1. Décrivez le comportement attendu et ce qui est observé, avec un exemple minimal sans secret ni donnée client.
2. Gardez la modification limitée à ce problème. Expliquez les limites de la solution.
3. Exécutez `npm ci`, installez Chromium avec `npx playwright install chromium`, puis lancez `npm run build`, `npm test` et `npm run catalog:check`.
4. Pour un changement de comportement, lancez aussi `npm run demo` et `npm run demo:broken`. Les fautes préparées doivent être détectées ; un contrôle ignoré n’est jamais une réussite.
5. Indiquez les commandes exécutées, leur résultat, le système, les versions et les vérifications qui restent à faire. Ne remplacez pas une preuve par une affirmation « testé ».

### Sources et droits

Les contributions au code original sont proposées sous Apache-2.0. En ajoutant du contenu externe, fournissez la source, sa licence et les attributions nécessaires. Ne recopiez pas une bibliothèque entière pour augmenter la taille du dépôt.

Pour les commits, ajoutez un `Signed-off-by` avec `git commit -s` après avoir lu le [Developer Certificate of Origin 1.1](https://developercertificate.org/). Cette signature atteste votre droit de soumettre la contribution sous sa licence. **Le DCO ne transfère pas vos droits d’auteur à NOMVEX.** Le nom et l’adresse utilisés dans le commit sont publics ; choisissez une adresse de contribution adaptée.

Une contribution peut rester attribuée à son auteur. Les responsables du projet décident des fusions et des versions selon les critères de qualité ; une contribution n’accorde pas automatiquement un accès administratif.

### Catalogue

Respectez [docs/CATALOG.md](docs/CATALOG.md). Une source consultée reçoit `source-reviewed`. Ne déclarez pas `tested` ou `used-in-nomvex` sans une procédure, un environnement, une version et une preuve consultables. Une valeur `null` indique une information non établie ; ne la transformez pas en « gratuit », « sûr » ou « compatible » par défaut.

### Communication

Utilisez les issues pour des problèmes publics sans données sensibles. Les signalements de vulnérabilité suivent [SECURITY.md](SECURITY.md). Aucune contribution ou demande de support ne nécessite une étoile. Les contributions automatisées doivent être relues, sourcées et conformes aux mêmes critères que les autres.

## English

Submit a focused change that solves a specific problem: a reproducible defect, a more reliable check, FR/EN documentation, accessibility, or a properly sourced catalog entry.

Include expected and observed behavior, a minimal example without secrets or customer data, and the commands and environment used to verify the change. Run `npm run build`, `npm test`, and `npm run catalog:check` after installing dependencies and Chromium. For behavior changes, run both demo variants and confirm that the prepared faults are detected. Report anything not verified.

Original-code contributions use Apache-2.0. Preserve upstream licenses and attribution for external material. Read the [DCO 1.1](https://developercertificate.org/) and use `git commit -s` only if you can make its certification. **The DCO is a right-to-contribute statement, not a copyright assignment.** Commit identity is public. Maintainers retain merge and release decisions; contributing does not grant administrative access.

Catalog claims must follow [the catalog rules](docs/CATALOG.md). Source review is not an executed test. Unknown values stay `null`. Follow [SECURITY.md](SECURITY.md) for vulnerability reports and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) in discussions. Stars and subscriptions are not contribution or support requirements.
