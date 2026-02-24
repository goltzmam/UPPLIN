import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "sonner";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    toast.info("Página não encontrada", {
      description: `A página "${location.pathname}" não existe. Você foi redirecionado para a home.`,
    });
  }, [location.pathname]);

  return <Navigate to="/" replace />;
};

export default NotFound;
