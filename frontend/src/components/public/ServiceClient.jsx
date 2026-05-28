import React from "react";

export default function ServiceClient() {
  // Exemple de données mockées
  const agents = [
    // { id: 1, country: "Ismaël Brevie", phone: "+7 927 353-16-12", available: true },
    { id: 1, country: "Marie Colombe", phone: "+225 07 87 044 546", available: true },
    { id: 2, country: "Doupi", phone: "+7 (980) 319-71-62", available: true },
    { id: 3, country: "Iroko", phone: "+7 (999) 178-41-38", available: true },
    // { id: 4, country: "Sénégal", phone: "+221 7 08 15 23", available: true },
  ];

  // Fonction pour formater le numéro de téléphone pour WhatsApp
  const formatPhoneForWhatsApp = (phone) => {
    return phone.replace(/[\s\(\-\+\)]/g, '');
  };

  // Fonction pour générer le lien WhatsApp
  const getWhatsAppLink = (phone) => {
    const formattedPhone = formatPhoneForWhatsApp(phone);
    return `https://wa.me/${formattedPhone}`;
  };

  return (
    <div className="bg-white shadow-lg rounded-2xl p-4 sm:p-6 border border-gray-100 mx-2 sm:mx-0">
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Service Client</h2>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">Contactez nos agents selon votre pays</p>
      </div>
      
      <div className="space-y-4">
        {agents.map((agent) => (
          <div 
            key={agent.id} 
            className="p-3 sm:p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition-all duration-200 hover:shadow-md"
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div className="flex items-start sm:items-center space-x-3 sm:space-x-4">
                <div className={`w-3 h-3 rounded-full mt-1.5 sm:mt-0 flex-shrink-0 ${
                  agent.available ? "bg-green-500" : "bg-red-500"
                }`}></div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 gap-1 sm:gap-0">
                    <p className="font-bold text-gray-800 text-base sm:text-lg truncate">{agent.country}</p>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full self-start sm:self-auto">
                      Agent #{agent.id}
                    </span>
                  </div>
                  <div className="flex items-center mt-1 space-x-2">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                    </svg>
                    <p className="text-gray-600 font-medium text-sm sm:text-base truncate">{agent.phone}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col xs:flex-row sm:flex-col lg:flex-row items-stretch xs:items-center sm:items-stretch lg:items-center gap-2 sm:gap-3">
                <span
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold flex items-center justify-center space-x-1 ${
                    agent.available 
                      ? "bg-green-50 text-green-700 border border-green-200" 
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${
                    agent.available ? "bg-green-500" : "bg-red-500"
                  }`}></span>
                  <span>{agent.available ? "Disponible" : "Occupé"}</span>
                </span>
                
                <a 
                  href={agent.available ? getWhatsAppLink(agent.phone) : "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 ${
                    agent.available 
                      ? "bg-green-600 text-white hover:bg-green-700 shadow-sm" 
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                  onClick={(e) => !agent.available && e.preventDefault()}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893c0-3.18-1.24-6.169-3.495-8.416"/>
                  </svg>
                  <span>Message</span>
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-gray-600">
          <div className="flex flex-col xs:flex-row items-start xs:items-center space-y-2 xs:space-y-0 xs:space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs sm:text-sm">Disponible</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-xs sm:text-sm">Occupé</span>
            </div>
          </div>
          <span className="text-xs sm:text-sm text-gray-500 text-right">Horaires: 8h-22h (GMT)</span>
        </div>
      </div>
    </div>
  );
}