/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { processDepensesRecurrentes } from "./lib/depenses-utils";
import { checkAndSendWeaningNotifications } from "./lib/notifications";
import { loadSavedTheme } from "./lib/theme";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Cheptel from "./pages/Cheptel";
import Reproduction from "./pages/Reproduction";
import Saillies from "./pages/Saillies";
import Portees from "./pages/Portees";
import Alertes from "./pages/Alertes";
import Sante from "./pages/Sante";
import SanteNouveau from "./pages/SanteNouveau";
import SanteEdit from "./pages/SanteEdit";
import FicheSante from "./pages/FicheSante";
import SanteFait from "./pages/SanteFait";
import Depenses from "./pages/Depenses";
import Recettes from "./pages/Recettes";
import NouvelleRace from "./pages/NouvelleRace";
import NouveauReproducteur from "./pages/NouveauReproducteur";
import FicheReproducteur from "./pages/FicheReproducteur";
import NouvelleSaillie from "./pages/NouvelleSaillie";
import FicheSaillie from "./pages/FicheSaillie";
import NouvellePortee from "./pages/NouvellePortee";
import FichePortee from "./pages/FichePortee";
import Parametres from "./pages/Parametres";

export default function App() {
  useEffect(() => {
    loadSavedTheme();
    processDepensesRecurrentes().catch(console.error);
    checkAndSendWeaningNotifications().catch(console.error);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="cheptel" element={<Cheptel />} />
          <Route path="cheptel/new" element={<NouveauReproducteur />} />
          <Route path="cheptel/:id" element={<FicheReproducteur />} />
          <Route path="races/new" element={<NouvelleRace />} />
          <Route path="reproduction" element={<Reproduction />} />
          <Route path="saillies" element={<Saillies />} />
          <Route path="saillies/new" element={<NouvelleSaillie />} />
          <Route path="saillies/:id" element={<FicheSaillie />} />
          <Route path="portees" element={<Portees />} />
          <Route path="portees/new" element={<NouvellePortee />} />
          <Route path="portees/:id" element={<FichePortee />} />
          <Route path="sante" element={<Sante />} />
          <Route path="sante/new" element={<SanteNouveau />} />
          <Route path="sante/edit/:id" element={<SanteEdit />} />
          <Route path="sante/fait" element={<SanteFait />} />
          <Route path="sante/:id" element={<FicheSante />} />
          <Route path="depenses" element={<Depenses />} />
          <Route path="recettes" element={<Recettes />} />
          <Route path="alertes" element={<Alertes />} />
          <Route path="parametres" element={<Parametres />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

