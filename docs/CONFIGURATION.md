# Configuration de Web Checks / Web Checks configuration

Le fichier est un JSON déclaratif strict, version 1. Une faute de frappe, un champ inconnu, un identifiant dupliqué ou une assertion incompatible provoque `INVALID_CONFIG`, code de sortie 2. Aucun JavaScript, commande shell ou module arbitraire n’est exécuté depuis ce JSON.

The configuration is strict declarative JSON, version 1. Unknown fields, duplicate IDs, invalid bounds and incompatible assertions are rejected. It contains no executable scripts.

## Démarrage / Getting started

```sh
npm ci
npx playwright install chromium
npm run build
npm run demo
```

La démonstration démarre un serveur sur une adresse de boucle locale et un port libre, exécute six contrôles, écrit les rapports et arrête le serveur. Elle utilise uniquement des comptes et fichiers synthétiques. `npm run demo:broken` produit des échecs volontaires et **retourne 1** ; cette sortie n’est pas un échec d’installation.

To keep the demo site open in one terminal and run a configurable check in another:

```sh
npm run fixture
```

```sh
npm run check -- --config examples/config.json --out reports/manual-01 --lang en
```

Le serveur manuel utilise `http://127.0.0.1:4317`. Les fichiers de rapport existants ne sont jamais écrasés : choisissez un nouveau dossier pour une nouvelle exécution, ou omettez `--out` pour obtenir un nom unique. `--lang` prend priorité sur `language` dans le JSON. Le dossier contient `report.json` et `report.html` ; le HTML s’ouvre localement sans serveur, script ni service externe.

## Exemple minimal / Minimal example

```json
{
  "version": 1,
  "baseUrl": "https://staging.example.test",
  "timeoutMs": 15000,
  "concurrency": 2,
  "language": "fr",
  "checks": [
    {
      "id": "login-return",
      "kind": "redirect",
      "startPath": "/login?returnTo=%2Fmembers",
      "steps": [
        { "action": "fill", "selector": "#email", "env": "NOMVEX_TEST_EMAIL" },
        { "action": "fill", "selector": "#password", "env": "NOMVEX_TEST_PASSWORD" },
        { "action": "click", "selector": "button[type=submit]" }
      ],
      "expectedPath": "/members"
    }
  ]
}
```

Les sélecteurs et chemins ci-dessus sont illustratifs, pas une description d’un site NOMVEX existant. Configurez des comptes de test et les vrais sélecteurs de votre environnement autorisé. Une connexion simulée dans la démonstration ne prouve pas le fonctionnement d’une authentification de production.

The paths and selectors are examples, not verified NOMVEX routes. Use test accounts and selectors from your authorized staging environment.

## Champs communs / Common fields

| Champ / Field | Valeur / Value |
|---|---|
| `version` | `1` |
| `baseUrl` | Origine HTTP(S) uniquement : schéma, hôte, port. Pas de chemin, identifiants, query ou fragment. / Origin only. |
| `allowedOrigins` | Jusqu’à 20 origines supplémentaires exactes, par exemple votre fournisseur d’identité de test. Aucun wildcard. / Up to 20 exact extra origins. |
| `timeoutMs` | 500–60000 ms par contrôle, défaut 15000. Le navigateur dispose de 30000 ms pour démarrer avant les contrôles ; le nettoyage ajoute aussi du temps. / Per-check budget. Browser startup has a separate 30000 ms limit; cleanup also adds time. |
| `concurrency` | 1–4 sessions, défaut 2. / Parallel sessions. |
| `language` | `fr` par défaut ou `en`. Langue du rapport et locale initiale du navigateur, distincte de `expectedLang`. |
| `checks` | 1–50 contrôles. / Checks. |
| `id` | Unique, 1–80 caractères ASCII alphanumériques avec `.`, `_`, `-` ; commence par une lettre ou un chiffre. Évitez toute donnée sensible. |
| `startPath` | Chemin commençant par `/`, ou URL absolue HTTP(S) sur une origine approuvée. Query et fragment acceptés. |
| `steps` | 0–20 interactions déclaratives. / Declarative interactions. |
| `enabled` | `false` ignore un contrôle et rend la vérification incomplète : sortie 2. |

Chaque contrôle commence dans une session neuve. Les cookies d’un contrôle ne sont pas partagés avec le suivant. Si un export exige une connexion, incluez la connexion dans les `steps` de ce contrôle.

Every check has a fresh browser context. Repeat the required sign-in steps inside each authenticated check.

## Interactions / Actions

```json
{ "action": "click", "selector": "[data-testid=continue]" }
```

```json
{ "action": "fill", "selector": "#name", "value": "Demo" }
```

```json
{ "action": "fill", "selector": "#password", "env": "NOMVEX_TEST_PASSWORD" }
```

```json
{ "action": "select", "selector": "#language", "value": "en" }
```

`fill` accepte **exactement un** de `value` ou `env`. Une variable manquante ou vide produit `MISSING_ENV`. Définissez les secrets dans votre terminal ou votre gestionnaire de secrets, jamais dans le dépôt. Aucun fichier `.env` n’est chargé automatiquement. Les actions utilisent les sélecteurs Playwright et leurs mécanismes d’attente ; aucun délai arbitraire configurable n’est nécessaire.

## Redirection

`kind: "redirect"` exige `expectedPath`. Après les interactions, l’URL finale doit correspondre exactement à l’URL résolue, y compris query et fragment. Le contrôle attend une navigation différée jusqu’à son délai maximal. Une page d’erreur HTTP ne constitue pas une réussite.

The check compares the final URL exactly. This verifies a destination, not the full authentication or authorization security model.

## Persistance de langue / Language persistence

```json
{
  "id": "language-kept",
  "kind": "locale",
  "startPath": "/settings",
  "steps": [{ "action": "select", "selector": "#language", "value": "en" }],
  "expectedLang": "en",
  "text": { "selector": "h1", "includes": "Settings" },
  "reload": true,
  "followPath": "/profile"
}
```

Le contrôle compare `<html lang>` sans distinction de casse, puis le texte visible facultatif. Il répète ces assertions après rechargement (`reload` vaut **true par défaut**) et après une navigation `followPath` si fournie. `reload: false` désactive uniquement l’étape de rechargement. Cela ne vérifie pas toutes les traductions, le format des dates, ni le rendu RTL.

## Exports / Downloads

```json
{
  "id": "export-csv",
  "kind": "download",
  "startPath": "/reports",
  "trigger": "[data-testid=download-csv]",
  "format": "csv",
  "minBytes": 20,
  "csvHeaders": ["name", "count"]
}
```

| Format | Assertions et limites / Assertions and limits |
|---|---|
| `pdf` | En-tête, fin de fichier, analyse réelle par pdf-lib, au moins une page. PDF chiffré rejeté. Ni rendu visuel, ni extraction de texte, ni analyse antivirus. |
| `json` | UTF-8 et JSON valides ; `requiredKeys` contrôle les clés propres au premier niveau. Aucun type métier n’est inféré. |
| `csv` | UTF-8, parseur CSV avec guillemets, colonnes cohérentes ; `csvHeaders` compare l’ordre exact. Séparateur virgule. Les formules de tableur ne sont pas évaluées. |
| `text` | UTF-8 valide, contenu non vide ; `expectedText` exige une sous-chaîne exacte. |

`expectedText` est également disponible pour JSON et CSV et compare leur texte brut. Il est rejeté pour PDF. `requiredKeys` est réservé au JSON ; `csvHeaders` au CSV. `minBytes` va de 1 à 10 Mio. La limite fixe d’acceptation est **10 × 1024 × 1024 octets**. Les téléchargements trop grands sont annulés ; les notifications de progression Chromium peuvent laisser passer des octets en transit avant l’annulation, surtout en HTTPS.

L’analyse du fichier s’exécute dans un worker séparé, avec un délai maximal de cinq secondes limité au temps restant du contrôle. Des limites de tas JavaScript sont appliquées ; elles ne constituent pas une limite mémoire système couvrant toutes les allocations natives. Les fichiers non fiables doivent toujours être traités dans un environnement isolé.

Un lien ouvrant un PDF dans un onglet n’est pas nécessairement un téléchargement. Le site testé doit déclencher un événement de téléchargement navigateur. Le nom et le type MIME seuls ne prouvent jamais la validité du fichier. Le fichier temporaire est supprimé après vérification, pas publié dans le rapport.

## Résultats / Results

| État / Status | Signification / Meaning | Code CLI |
|---|---|---|
| `passed` | Assertions satisfaites. / Assertions passed. | `0` si tous réussissent |
| `failed` | Comportement différent ou fichier invalide. / Behavioral mismatch. | `1` |
| `error` | Impossible de conclure : réseau, environnement, délai, configuration d’action. / Could not complete. | `2` |
| `skipped` | Contrôle explicitement désactivé. / Disabled check. | `2` |

Une erreur ou un contrôle ignoré prend priorité sur les échecs : une exécution mixte retourne 2. Les rapports contiennent des codes diagnostiques stables, durées, compteurs et preuves bornées. Les mots de passe, valeurs de formulaire, textes téléchargés, URL avec paramètres, traces et captures ne sont pas copiés dans les rapports. L’origine cible et les identifiants de contrôle restent visibles : vérifiez-les avant de partager un rapport.

## Intégration JavaScript / Library use

```js
import { runChecks, validateConfig, exitCode } from './dist/index.js';

const report = await runChecks(validateConfig(configuration));
process.exitCode = exitCode(report);
```

Le paquet n’est pas annoncé comme publié sur npm. Utilisez le dépôt construit, ou l’archive produite par `npm pack`. Les dépendances sont verrouillées par `package-lock.json`.

## Environnement et limites / Environment and limits

- Node.js 22 ou 24 et Chromium installé pour la version Playwright verrouillée. Les autres versions/OS ne sont pas présumés validés ; voir [ACCEPTANCE.md](ACCEPTANCE.md).
- Si le téléchargement officiel échoue, vérifiez l’erreur réseau et [la documentation Playwright](https://playwright.dev/docs/browsers). Un Chromium approuvé déjà installé peut être sélectionné via `NOMVEX_BROWSER_EXECUTABLE` ; une autre version peut être incompatible.
- Origines HTTP(S) exactes autorisées, y compris les redirections réseau. Les nouvelles fenêtres, WebSockets, dedicated Web Workers, Shared Workers et service workers ne sont pas pris en charge dans v0.1.0. Un parcours qui démarre un dedicated ou Shared Worker reçoit `WORKER_UNSUPPORTED` ; cela évite un succès trompeur pour un transport que cette version ne peut pas observer complètement. MFA et CAPTCHA demandent un scénario plus spécialisé.
- Le garde réseau est une protection de test, pas un bac à sable système pour exécuter des pages ou fichiers hostiles. Utilisez une machine isolée pour des cibles non fiables ; ne lancez pas le projet sur un runner de production partagé.
- Aucun compte NOMVEX, service payant ou télémétrie n’est requis. Le navigateur contacte toutefois les cibles et origines que vous autorisez.

## Adapter à une branche NOMVEX / Adapt to a NOMVEX branch

Choisissez un environnement de test, les trois parcours utiles et un compte de test. Copiez l’exemple, remplacez uniquement les origines, chemins et sélecteurs réellement observés, puis exécutez le CLI. Conservez la configuration sans secrets et la preuve d’exécution. Une intégration réelle n’est acceptée qu’après succès sur la branche concernée et vérification manuelle d’au moins un échec volontaire.

Pick an authorized staging target, observe its real UI, configure the journeys, and retain the resulting evidence. The local fixtures are reproducibility tests, not proof of deployment to a live NOMVEX platform.
