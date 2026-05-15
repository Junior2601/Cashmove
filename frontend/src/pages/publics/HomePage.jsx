import React, { useState, useEffect } from 'react';
import TransactionForm from '../../components/public/TransactionForm';
import TrackingForm from '../../components/public/TrackingForm';
import ServiceClient from '../../components/public/ServiceClient';
import ConversionCalculator from '../../components/public/ConversionCalculator';
import { Send, Search, HeadphonesIcon, Calculator, ChevronLeft, ChevronRight } from 'lucide-react';
import heroImage from '../../assets/fond.png';
import votreLogo from '../../assets/logo.png';

export default function HomePage() {
  const [activeSection, setActiveSection] = useState('transaction');
  const [isLoading, setIsLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  const carouselSlides = [
    {
      id: 1,
      title: "Transférez de l'argent dans le monde",
      subtitle: "Rapide, sécurisé et sans création de compte"
    },
    {
      id: 2,
      title: "Des transferts instantanés",
      subtitle: "Recevez votre argent en quelques minutes seulement"
    },
    {
      id: 3,
      title: "Des taux compétitifs",
      subtitle: "Les meilleurs taux de change pour vos transferts"
    }
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isLoading, carouselSlides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const sections = [
    {
      id: 'transaction',
      title: 'Nouvelle Transaction',
      description: 'Transférer de l\'argent rapidement',
      icon: Send,
      color: 'blue'
    },
    {
      id: 'suivi',
      title: 'Suivi Transaction',
      description: 'Suivre votre transfert',
      icon: Search,
      color: 'green'
    },
    {
      id: 'service',
      title: 'Service Client',
      description: 'Contacts et assistance',
      icon: HeadphonesIcon,
      color: 'purple'
    },
    {
      id: 'calculatrice',
      title: 'Calculatrice',
      description: 'Convertir les devises',
      icon: Calculator,
      color: 'orange'
    }
  ];

  const getColorClasses = (color, isActive) => {
    const colorMap = {
      blue: {
        active: 'bg-blue-600 text-white',
        inactive: 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
      },
      green: {
        active: 'bg-green-600 text-white',
        inactive: 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
      },
      purple: {
        active: 'bg-purple-600 text-white',
        inactive: 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
      },
      orange: {
        active: 'bg-orange-600 text-white',
        inactive: 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
      }
    };
    
    return isActive 
      ? `${colorMap[color].active} shadow-lg transform scale-105` 
      : `${colorMap[color].inactive} hover:shadow-md`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-32 h-32 mx-auto mb-6 flex items-center justify-center">
              <img 
                src={votreLogo} 
                alt="MoveCash Logo" 
                className="w-20 h-20 animate-pulse"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.className = 'w-20 h-20 bg-white rounded-2xl flex items-center justify-center';
                  fallback.innerHTML = '<span class="text-blue-600 font-bold text-lg">MC</span>';
                  e.target.parentNode.appendChild(fallback);
                }}
              />
            </div>
            
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-40 h-40">
                <div className="absolute inset-0 border-4 border-dotted border-white border-opacity-30 rounded-full animate-spin-slow"></div>
                <div className="absolute inset-2 border-4 border-dotted border-yellow-300 border-opacity-70 rounded-full animate-spin-slow-reverse"></div>
                <div className="absolute inset-4 border-4 border-dotted border-white border-opacity-50 rounded-full animate-spin-medium"></div>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              Move<span className="text-yellow-300">Cash</span>
            </h1>
            
            <div className="text-blue-100 text-sm space-y-1">
              <p className="animate-pulse">Initialisation des services...</p>
              <p className="text-xs text-blue-200 opacity-80">
                Transferts rapides et sécurisés
              </p>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes spin-slow {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes spin-slow-reverse {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(-360deg); }
          }
          @keyframes spin-medium {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(180deg); }
          }
          .animate-spin-slow { animation: spin-slow 3s linear infinite; }
          .animate-spin-slow-reverse { animation: spin-slow-reverse 4s linear infinite; }
          .animate-spin-medium { animation: spin-medium 2s linear infinite; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="relative h-96 md:h-[500px] overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800">
        <div className="relative w-full h-full">
          {carouselSlides.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className="w-full h-full">
                <div className="absolute inset-0 bg-blue-900 bg-opacity-20"></div>
                <div className="relative h-full flex items-center justify-center text-center">
                  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl md:text-5xl font-bold mb-4 text-white animate-fade-in">
                      {slide.title}
                    </h1>
                    <p className="text-lg md:text-xl text-blue-100 animate-fade-in-up">
                      {slide.subtitle}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-full transition-all duration-300"
          aria-label="Slide précédent"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-full transition-all duration-300"
          aria-label="Slide suivant"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {carouselSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'bg-white scale-125' 
                  : 'bg-white bg-opacity-50 hover:bg-opacity-75'
              }`}
              aria-label={`Aller au slide ${index + 1}`}
            />
          ))}
        </div>
      </header>

      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Nos Services
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Tout ce dont vous avez besoin pour vos transferts d'argent
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center space-x-3 px-6 py-3 rounded-full font-medium transition-all duration-300 ${getColorClasses(section.color, activeSection === section.id)}`}
              >
                <section.icon className="h-5 w-5" />
                <span>{section.title}</span>
              </button>
            ))}
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 md:p-8">
                {activeSection === 'transaction' && (
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                      <Send className="mr-3 h-6 w-6 text-blue-600" />
                      Initier une Transaction
                    </h3>
                    <TransactionForm />
                  </div>
                )}
                
                {activeSection === 'suivi' && (
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                      <Search className="mr-3 h-6 w-6 text-green-600" />
                      Suivre une Transaction
                    </h3>
                    <TrackingForm />
                  </div>
                )}
                
                {activeSection === 'service' && (
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                      <HeadphonesIcon className="mr-3 h-6 w-6 text-purple-600" />
                      Service Client
                    </h3>
                    <ServiceClient />
                  </div>
                )}
                
                {activeSection === 'calculatrice' && (
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                      <Calculator className="mr-3 h-6 w-6 text-orange-600" />
                      Calculatrice de Conversion
                    </h3>
                    <ConversionCalculator />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-gray-900">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="xl:grid xl:grid-cols-3 xl:gap-8">
            <div className="space-y-8 xl:col-span-1">
              <p className="text-gray-400 text-base">
                La plateforme de confiance pour vos transferts d'argent dans le monde.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-8 xl:mt-0 xl:col-span-2">
              <div className="md:grid md:grid-cols-2 md:gap-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">
                    Services
                  </h3>
                  <ul className="mt-4 space-y-4">
                    <li>
                      <a 
                        href="#transaction" 
                        className="text-base text-gray-300 hover:text-white" 
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveSection('transaction');
                        }}
                      >
                        Transfert d'argent
                      </a>
                    </li>
                    <li>
                      <a 
                        href="#suivi" 
                        className="text-base text-gray-300 hover:text-white" 
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveSection('suivi');
                        }}
                      >
                        Suivi transaction
                      </a>
                    </li>
                    <li>
                      <a 
                        href="#service" 
                        className="text-base text-gray-300 hover:text-white" 
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveSection('service');
                        }}
                      >
                        Support client
                      </a>
                    </li>
                  </ul>
                </div>
                <div className="mt-12 md:mt-0">
                  <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">
                    Sécurité
                  </h3>
                  <ul className="mt-4 space-y-4">
                    <li><a href="#" className="text-base text-gray-300 hover:text-white">Agents agréés</a></li>
                    <li><a href="#" className="text-base text-gray-300 hover:text-white">Transactions sécurisées</a></li>
                    <li><a href="#" className="text-base text-gray-300 hover:text-white">Support 24/7</a></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out 0.2s both;
        }
      `}</style>
    </div>
  );
}