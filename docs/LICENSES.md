# Licences et attribution / Licenses and attribution

## Français

### Code original

Le [fichier LICENSE](../LICENSE) contient le texte officiel non modifié d’Apache-2.0, téléchargé depuis [apache.org](https://www.apache.org/licenses/LICENSE-2.0.txt). L’attribution du projet figure dans [NOTICE](../NOTICE) : **Copyright 2026 NOMVEX contributors**.

Apache-2.0 permet notamment la réutilisation et la distribution sous ses conditions ; son texte comporte une concession de droits d’auteur et de certains droits de brevet. Publier du code sous cette licence donne donc des droits réels aux destinataires. L’administration du dépôt et la propriété de la société sont distinctes de ces droits sur le code. Ce fichier n’ajoute aucune restriction commerciale, obligation d’étoile ou condition d’abonnement à la licence.

### Dépendances et contenu référencé

La licence du projet ne remplace pas celles des dépendances. Les notices et licences des paquets effectivement installés doivent être conservées lorsque leur distribution l’exige. Le catalogue contient des liens et descriptions originales ; il ne distribue pas les outils, poids de modèles, données ou binaires référencés.

La revue initiale porte sur les déclarations de licence des sources primaires. Elle n’est pas un inventaire exhaustif des licences transitives de chaque outil. Vérifiez les versions verrouillées et tous les composants effectivement distribués avant de créer un paquet ou une image contenant des outils tiers. Le champ `license.models: null` signifie qu’aucun modèle particulier n’a été évalué ; il ne certifie pas l’absence d’obligations.

### Points qui demandent une lecture spécifique

| Projet ou cas | Point établi et limite |
| --- | --- |
| MIT | Permet la réutilisation commerciale sous réserve des notices requises ; ne promet pas le support |
| Apache-2.0 | Lire les dispositions d’attribution, de modifications et de brevets ; conserver les notices applicables |
| axe-core | Code sous MPL-2.0 ; ne pas le présenter comme MIT |
| FFmpeg | Base LGPL-2.1-or-later ; certaines options et dépendances GPL changent la licence de la compilation |
| Docling | Code MIT ; les modèles ont leurs propres licences à vérifier dans leurs sources |
| faster-whisper / whisper.cpp | Le statut MIT du code ne constitue pas une autorisation générale pour n’importe quel modèle ajouté |
| sharp | Licence du code distincte de l’examen des composants natifs, dont libvips |
| n8n | Code source disponible sous Sustainable Use License, avec exceptions Enterprise ; ce n’est pas une licence open source OSI |

La [FAQ actuelle de n8n](https://docs.n8n.io/n8n-community-license/community-license/license-faq) autorise certains workflows construits par l’opérateur derrière un produit, y compris certains raccordements de comptes utilisateurs. Elle distingue ce cas d’un produit qui permet aux utilisateurs externes de construire ou modifier leurs propres workflows via interface, API, MCP ou agent. Cacher l’éditeur n8n ne règle pas cette distinction. Cette fiche n’affirme pas qu’une architecture NOMVEX particulière a été validée.

### Contributions

Le [DCO 1.1](https://developercertificate.org/) atteste le droit du contributeur à soumettre son travail sous la licence indiquée. **Il ne cède pas ses droits d’auteur.** Les attributions sont conservées et les responsables gardent la décision de fusion et de version. N’affirmez pas que le propriétaire du compte possède exclusivement tout le code proposé par d’autres personnes.

### Sources primaires

- [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
- [MIT — texte et conditions](https://choosealicense.com/licenses/mit/)
- [GitHub — Licensing a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)
- [GitHub — Legal side of open source](https://opensource.guide/legal/)
- [Developer Certificate of Origin](https://developercertificate.org/)
- [FFmpeg — License](https://ffmpeg.org/legal.html)
- [n8n Community License](https://docs.n8n.io/n8n-community-license)
- Les pages de chaque outil dans [catalog/tools.json](../catalog/tools.json).

## English

The repository's original code and documentation use the unmodified official Apache-2.0 text, with attribution in `NOTICE`. This grants recipients meaningful reuse rights under the license; repository administration and company ownership are separate matters.

Dependencies retain their own licenses. The catalog contains original descriptions and source links, not redistributed upstream code, model weights, datasets, or binaries. Primary-source review is not a full transitive license audit. Check pinned versions, shipped components, build options, and required notices before distribution.

MIT or Apache code licensing does not automatically cover arbitrary model weights, data, or native dependencies. FFmpeg's effective build license depends on included components. n8n is source-available with use restrictions; consult its current FAQ when distinguishing operator-built background workflows from end-user workflow construction. No specific production architecture is certified here.

A DCO sign-off certifies the right to contribute; it is not a copyright assignment. Contributors' attribution and applicable rights remain respected. No extra star, subscription, or commercial-use restriction is added to Apache-2.0.
