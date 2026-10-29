import { useEffect, useState } from "react";
import { HealthResponseSchema } from "@app/shared";

function App() {
  const [apiStatus, setApiStatus] = useState<"online" | "offline" | "loading">("loading");

  useEffect(() => {
    fetch("/api/v1/health")
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw new Error("API not available");
      })
      .then((data) => {
        const result = HealthResponseSchema.safeParse(data);
        if (result.success && result.data.status === "ok") {
          setApiStatus("online");
        } else {
          setApiStatus("offline");
        }
      })
      .catch(() => {
        setApiStatus("offline");
      });
  }, []);

  if (apiStatus === "loading") {
    return <div>Loading...</div>;
  }

  return <div>API: {apiStatus}</div>;
}

export default App;
