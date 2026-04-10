#!/usr/bin/env python3
"""
Récupère les données d'une fiche RNCP depuis France Compétences.

Usage: python scripts/fetch_rncp.py <numero_rncp>
Exemple: python scripts/fetch_rncp.py 39238

Sauvegarde le résultat dans sources/rncp/<numero>.json
"""

import sys
import json
import os
import re

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Installation des dépendances...")
    os.system("pip install requests beautifulsoup4 --break-system-packages -q")
    import requests
    from bs4 import BeautifulSoup


def fetch_rncp(numero: str) -> dict:
    """Scrape la fiche RNCP depuis le site France Compétences."""

    url = f"https://www.francecompetences.fr/recherche/rncp/{numero}/"
    print(f"Récupération de {url}...")

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    }
    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    data = {
        "numero_rncp": numero,
        "url": url,
        "nomenclature_titre": "",
        "niveau": "",
        "code_nsf": "",
        "certificateur": "",
        "date_enregistrement": "",
        "blocs_competences": [],
        "modalites_evaluation": "",
        "debouches": [],
        "equivalences": "",
    }

    # Titre principal
    title_el = soup.find("h1")
    if title_el:
        data["nomenclature_titre"] = title_el.get_text(strip=True)

    # Chercher les informations dans les sections
    # Structure typique : des sections avec des titres h2/h3 et du contenu
    sections = soup.find_all(["h2", "h3", "h4"])
    for section in sections:
        text = section.get_text(strip=True).lower()

        # Blocs de compétences
        if "bloc" in text and "compétence" in text:
            bloc_name = section.get_text(strip=True)
            data["blocs_competences"].append(bloc_name)

        # Débouchés
        if "débouché" in text or "métier" in text:
            next_el = section.find_next_sibling()
            if next_el:
                items = next_el.find_all("li")
                if items:
                    data["debouches"] = [li.get_text(strip=True) for li in items]
                else:
                    data["debouches"] = [next_el.get_text(strip=True)]

    # Chercher le niveau, NSF, date dans les métadonnées
    meta_text = soup.get_text()

    niveau_match = re.search(r"Niveau\s*(\d)", meta_text)
    if niveau_match:
        data["niveau"] = niveau_match.group(1)

    nsf_match = re.search(r"NSF\s*([\d\w]+)", meta_text)
    if nsf_match:
        data["code_nsf"] = nsf_match.group(1)

    # Sauvegarder
    output_dir = "sources/rncp"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{numero}.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✓ Données RNCP sauvegardées dans {output_path}")
    print(f"  Titre: {data['nomenclature_titre'][:80]}...")
    print(f"  Niveau: {data['niveau']}")
    print(f"  Blocs de compétences: {len(data['blocs_competences'])}")
    print(f"  Débouchés: {len(data['debouches'])}")

    return data


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/fetch_rncp.py <numero_rncp>")
        sys.exit(1)

    fetch_rncp(sys.argv[1])
