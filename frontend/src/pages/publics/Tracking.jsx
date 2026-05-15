import { useState } from "react";
import api from "../../api/axios";

export default function Tracking() {
  const [code, setCode] = useState("");
  const [data, setData] = useState(null);

  const handleSearch = async () => {
    try {
      const res = await api.get(`/transactions/track/${code}`);
      setData(res.data.data);
    } catch {
      alert("Introuvable");
    }
  };

  return (
    <div className="p-6">

      <input
        placeholder="Code de suivi"
        onChange={(e) => setCode(e.target.value)}
      />

      <button onClick={handleSearch}>
        Rechercher
      </button>

      {data && (
        <div className="mt-4">
          <p>Status: {data.status}</p>
          <p>Montant: {data.send_amount}</p>
        </div>
      )}

    </div>
  );
}