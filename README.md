# Quartz Client

Jasny launcher Minecrafta (Electron). Logowanie Microsoft + offline, instancje, Modrinth i CurseForge,
import modpacków `.mrpack`, automatyczny Simple Voice Chat i paczka optymalizacji.

## Budowanie .exe (GitHub Actions)

1. Wypchnij kod na GitHub (gałąź `main`).
2. Zakładka **Actions -> Build Quartz Client -> Run workflow**, albo wypchnij tag:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```
3. Po kilku minutach gotowe pliki `.exe` (instalator + wersja portable) są w **Releases**
   (dla tagów) lub w artefaktach uruchomienia workflow.

## Klucz CurseForge

CurseForge wymaga darmowego klucza API z https://console.curseforge.com - wklej go w Ustawieniach.
Modrinth działa bez klucza.

## Co jest w wersji 0.1

- Vanilla, Fabric, Quilt - wszystkie wydania (opcjonalnie snapshoty)
- Konto Microsoft (premium) i tryb offline (sam nick)
- Modrinth: mody, modpacki, resource packi, shadery
- CurseForge: mody, resource packi, shadery
- Simple Voice Chat dodawany do każdej instancji i każdego modpacka (sprawdzany przy każdym starcie)
- Paczka optymalizacji: Sodium, Lithium, FerriteCore, Entity Culling, ImmediatelyFast, ModernFix, Iris, Mod Menu
- Flagi JVM (G1GC), automatyczne pobieranie właściwej Javy

## Plan na etap 2

Forge/NeoForge, import modpacków CurseForge, własny mod Quartz z GUI w grze, własna ikona (`build/icon.png`, min. 256x256).
