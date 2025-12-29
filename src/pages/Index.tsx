import { Layout } from "@/components/Layout";
import { DataImport } from "@/components/sections/DataImport";
import { Transformation } from "@/components/sections/Transformation";
import { TopsisClassic } from "@/components/sections/TopsisClassic";
import { FuzzyTopsis } from "@/components/sections/FuzzyTopsis";
import { MLComparison } from "@/components/sections/MLComparison";
import { useAnalysisStore } from "@/store/analysisStore";
import { Helmet } from "react-helmet";

const Index = () => {
  const { activeSection } = useAnalysisStore();

  const renderSection = () => {
    switch (activeSection) {
      case 0:
        return <DataImport />;
      case 1:
        return <Transformation />;
      case 2:
        return <TopsisClassic />;
      case 3:
        return <FuzzyTopsis />;
      case 4:
        return <MLComparison />;
      default:
        return <DataImport />;
    }
  };

  return (
    <>
      <Helmet>
        <title>Analyse ABC Multi-Critères | TOPSIS & Fuzzy MCDM</title>
        <meta 
          name="description" 
          content="Plateforme d'analyse décisionnelle multi-attributs pour la classification ABC des stocks avec TOPSIS, Fuzzy Logic et Machine Learning. Développé pour Prof. Lamrani - EMI Rabat." 
        />
      </Helmet>
      <Layout>{renderSection()}</Layout>
    </>
  );
};

export default Index;
