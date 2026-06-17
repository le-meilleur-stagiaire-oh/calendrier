import { createContext } from "react";

export const DEFAULT_ACCOUNTS = [
  { id: "APG",   name: "L'Apogée Courchevel",       color: "#7B2D3B", light: "#F5E6E9" },
  { id: "CSM",   name: "Château Saint-Martin & Spa", color: "#D4782F", light: "#FDF0E5" },
  { id: "HDCER", name: "Hôtel du Cap-Eden-Roc",      color: "#4A9FCC", light: "#E5F2FA" },
  { id: "BB",    name: "Beefbar Courchevel",          color: "#3A8A5C", light: "#E6F5ED" },
];

export const DEFAULT_VOICES = {
  APG:   "The voice of silent Alpine exclusivity. Raw mountain mornings, the smell of wood and snow, the feeling of being above the world. Intimate, not showy. Cozy but never rustic.",
  CSM:   "The voice of Provençal timelessness. Stone, light, lavender, silence broken only by cicadas. A place where time slows down on purpose. Poetic, grounded, never overwrought.",
  HDCER: "The voice of Mediterranean legend. This is where cinema, art and the sea have always met. Iconic without trying to be. The light here is different. Timeless, not trendy.",
  BB:    "The voice of unapologetic indulgence. Premium cuts, low lights, the sound of a room that knows how to have a good time. Confident, sensory, a little cinematic.",
};

export const DEFAULT_HASHTAG_BANK = {
  APG:   { "Tous": ["#lapogeecourchevel","#oetkerhotels","#luxuryhotel","#penthouse","#courchevel","#masterpiecehotels","#teatime","#pastry","#hotel","#winter","#snow","#restaurant","#pastries"] },
  CSM:   { "Tous": ["#oetkerhotels","#Vence","#summer","#southoffrance","#masterpiecehotels","#luxuryescape","#dreamstay","#ChateauStMartin","#FlavorsAndAmbiance","#SharedMoments","#hotel","#vence"] },
  HDCER: { "Tous": ["#hotelducapedenroc","#oetkerhotels","#FrenchRiviera","#LuxuryHotel","#southoffrance","#masterpiecehotels","#VacationGoals","#HotelduCapEdenRoc","#OetkerCollection","#MasterpieceHotels","#CoteDAzur","#TimelessElegance","#LuxuryEscape","#summer","#frenchriviera","#capdantibes"] },
  BB:    { "Tous": ["#lapogeecourchevel","#beefbarcourchevel","#courchevelrestaurant","#courchevel1850","#beefbar","#oetkerhotels","#courchevel","#restaurant","#winterdestination","#valentinesdays","#meat"] },
};

export const DEFAULT_MANDATORY = {
  APG:   ["#lapogeecourchevel","#oetkerhotels"],
  CSM:   ["#ChateauStMartin","#oetkerhotels"],
  HDCER: ["#hotelducapedenroc","#oetkerhotels"],
  BB:    [],
};

export const DEFAULT_BEST_TIMES = {
  APG:   { weekday: "18:00", weekend: "10:00", note: "Audience ski/montagne" },
  CSM:   { weekday: "12:00", weekend: "09:00", note: "Audience Provence/bien-être" },
  HDCER: { weekday: "17:00", weekend: "11:00", note: "Audience Côte d'Azur" },
  BB:    { weekday: "19:00", weekend: "12:00", note: "Audience gastronomie/nightlife" },
};

export const DEFAULT_MENTION = {
  APG: "@oetkerhotels", CSM: "@oetkerhotels", HDCER: "@oetkerhotels", BB: "@lapogeecourchevel",
};

export const DEFAULT_SUBFOLDERS = {
  APG:   ["Extérieur","Intérieur","Chambres","Chalets","F&B","Cuisine","Lifestyle"],
  CSM:   ["Extérieur","Intérieur","Chambres","Villas","F&B","Cuisine","Lifestyle"],
  HDCER: ["Extérieur","Intérieur","Chambres","Villas","F&B","Cuisine","Lifestyle"],
  BB:    ["F&B","Cuisine","Lifestyle"],
};

export const DEFAULT_SUBJECT_BANK = {
  HDCER: ["Lever de soleil sur la mer","Coucher de soleil iconique","Une journée à l'hôtel","Les plus belles vues","Room tour d'une suite","Les détails du luxe","La piscine mythique","Moments hors saison","Ambiance Riviera","Terrasse avec vue mer","Petit-déjeuner face à la mer","Moments de calme absolu","Les coins cachés","Arrivée d'un client","Expérience client complète","Service en chambre","Les jardins en fleurs","L'hôtel vu du ciel","Moments golden hour","Ambiance dolce vita"],
  CSM:   ["Vue panoramique","Moments de détente au spa","Une journée slow luxury","Les villas privées","Petit-déjeuner avec vue","Coucher de soleil sur les collines","Ambiance nature","Les jardins du domaine","Moments de silence","Dîner en terrasse","Expérience bien-être","Architecture du château","Moments intimistes","Les coins cachés","Une journée sans quitter l'hôtel","Ambiance romantique","Les saisons au domaine","Moments suspendus","Vue depuis la piscine","Évasion sur la Côte d'Azur"],
  APG:   ["Ski-in ski-out","Matin en montagne","Vue sur les pistes","Après-ski","Ambiance hivernale","Moments cocooning","Cheminée et ambiance chaleureuse","Une journée à Courchevel","Spa après ski","Neige qui tombe","Dîner en altitude","Activités montagne","Moments en famille","Ambiance soirée","Lever de soleil sur la neige","Vue depuis une suite","Expérience luxe en hiver","Moments cosy","Les pistes au lever du jour","Évasion alpine"],
  BB:    ["Cuisson d'une pièce de viande","Dressage d'assiette","Plats signature","Ambiance du restaurant","Dîner d'exception","Close-up food","Cocktails signature","Expérience client complète","Service en salle","Cuisine en action","Viandes premium","Moments de service","Ambiance soirée","Desserts signature","Plats à partager","Accords mets & vins","Textures et détails","Ambiance feutrée","Expérience gastronomique","Instants gourmands"],
};

export const LibraryContext = createContext({ library: [], setLibrary: () => {} });

export const AccountsContext = createContext({
  accounts:          DEFAULT_ACCOUNTS,
  voices:            DEFAULT_VOICES,
  hashtagBank:       DEFAULT_HASHTAG_BANK,
  mandatoryHashtags: DEFAULT_MANDATORY,
  bestTimes:         DEFAULT_BEST_TIMES,
  mentions:          DEFAULT_MENTION,
  subjectBank:       DEFAULT_SUBJECT_BANK,
});
