import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function Transaction() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    from_country_id: "",
    to_country_id: "",
    sender_phone: "",
    receiver_phone: "",
    sender_method_id: "",
    receiver_method_id: "",
    send_amount: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    try {
      const res = await api.post("/transactions", form);

      const trackingCode = res.data.data.tracking_code;

      navigate(`/transaction/${trackingCode}`);
    } catch (err) {
      alert("Erreur");
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">

      <h1 className="text-xl font-bold mb-4">
        Nouvelle transaction
      </h1>

      <input name="sender_phone" placeholder="Numéro expéditeur" onChange={handleChange} className="input" />
      <input name="receiver_phone" placeholder="Numéro destinataire" onChange={handleChange} className="input" />
      <input name="send_amount" placeholder="Montant" onChange={handleChange} className="input" />

      <button
        onClick={handleSubmit}
        className="bg-blue-600 text-white w-full mt-4 py-2"
      >
        Envoyer
      </button>

    </div>
  );
}