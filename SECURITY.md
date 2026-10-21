# Sécurité / Security

## Français

### Signaler une vulnérabilité

Si le dépôt publié propose **Security → Report a vulnerability**, utilisez ce canal privé. Sa disponibilité dépend des paramètres effectifs du dépôt ; cette documentation n’affirme pas qu’il est activé. Sinon, demandez un canal privé au responsable dans une issue sans inclure le secret, les données personnelles ou les détails exploitables. Aucun courriel de sécurité non vérifié n’est fourni.

Indiquez ensuite, en privé : version ou commit, environnement, impact, conditions nécessaires et reproduction minimale. Le projet n’annonce ni certification de sécurité, ni audit externe complet, ni délai de correction garanti. Lorsqu’une correction paraît, utilisez une version explicitement documentée ; un résultat de test ne constitue pas une garantie générale.

### Utilisation

Web Checks exécute des interactions dans un navigateur. Testez des applications pour lesquelles vous avez une autorisation et des données prévues à cet effet. Les clics et formulaires peuvent modifier l’état de l’application. La liste d’origines autorisées limite la navigation configurée ; elle ne remplace pas l’isolation du système ou du réseau.

Gardez les identifiants hors des configurations, des captures, des commits et des rapports partagés. Utilisez des variables d’environnement pour les valeurs sensibles. Vérifiez les fichiers générés avant publication. Ne faites pas traiter des applications ou fichiers malveillants avec un compte privilégié.

### Contributions et CI

Les pull requests externes doivent être exécutées dans des environnements jetables sans secret de production. N’exécutez pas leur code sur le VPS NOMVEX ou sur un runner ayant accès au réseau de production. Une approbation manuelle de workflow ne rend pas son code sûr. Les mises à jour de dépendances doivent être revues, verrouillées et vérifiées avant une version.

Référence : [GitHub — Security hardening for GitHub Actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions).

## English

Use **Security → Report a vulnerability** if the published repository actually offers it. Otherwise request a private channel from a maintainer without disclosing exploitable details, secrets, or personal data in a public issue. No unverified security email or guaranteed response deadline is advertised.

Privately include version/commit, environment, impact, prerequisites, and a minimal reproduction. Browser steps can change application state; use authorized targets and test data. An origin allowlist is not a system or network sandbox. Keep credentials out of committed configs and shared reports; use environment references and review output before sharing.

External PRs require disposable test environments without production secrets or production-network access. Do not run them on the NOMVEX VPS or an owner production runner. Review dependency updates and verification evidence. A passing run is not a security certification.
