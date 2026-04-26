'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, Timestamp, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import { Reservation, Boat } from '@/types';
import { Loader2, CheckCircle, AlertCircle, Ship, Camera, FileText, Calendar, User, Phone, Globe } from 'lucide-react';

// Tipos de idiomas suportados
type SupportedLanguage = 'pt-BR' | 'en' | 'es' | 'de' | 'fr';

// Idiomas disponíveis
const LANGUAGES: { code: SupportedLanguage; name: string; flag: string }[] = [
  { code: 'pt-BR', name: 'Português', flag: '🇧🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
];

// Traduções para a página de aceite
const translations: Record<SupportedLanguage, Record<string, string>> = {
  'pt-BR': {
    loading: 'Carregando...',
    error: 'Erro',
    invalidLink: 'Link inválido',
    notFound: 'Reserva não encontrada',
    loadError: 'Erro ao carregar dados. Tente novamente.',
    termsAccepted: 'Termos Aceitos!',
    thankYou: 'Obrigado',
    successMessage: 'Seus termos foram registrados com sucesso.',
    boatTerms: 'Termos de uso do barco:',
    accepted: 'Aceito',
    imageUsage: 'Uso de imagem:',
    authorized: 'Autorizado',
    voucherInfo: 'Agora você receberá seu voucher de embarque. Apresente-o no dia do passeio.',
    confirmTerms: 'Confirmação de Termos',
    toProceed: 'Para prosseguir com seu passeio',
    passenger: 'Passageiro',
    phone: 'Telefone',
    tourDate: 'Data do Passeio',
    seat: 'Assento',
    groupLeader: 'Responsável pelo Grupo',
    acceptingFor: 'Você está aceitando os termos em nome de',
    persons: 'pessoa(s)',
    groupMembers: 'Membros do grupo:',
    boatTermsTitle: 'Termos de Uso do Barco',
    readRules: 'Leia as regras do passeio',
    hide: 'Ocultar',
    viewTerms: 'Ver termos',
    iAcceptBoatTerms: 'Li e aceito os termos de uso do barco',
    agreeRules: 'Concordo com todas as regras e condições do passeio.',
    imageAuthTitle: 'Autorização de Uso de Imagem',
    optional: 'Opcional - para redes sociais',
    iAuthorizeImage: 'Autorizo o uso da minha imagem',
    optionalSocial: 'Opcional - Para divulgação em redes sociais.',
    confirmButton: 'Confirmar e Aceitar Termos',
    saving: 'Salvando...',
    legalNote: 'Ao confirmar, seus dados de aceite serão registrados para fins de comprovação legal.',
    acceptTermsAlert: 'Você precisa aceitar os termos de uso do barco para continuar.',
    saveError: 'Erro ao salvar. Tente novamente.',
    // Termos completos
    termsTitle: 'TERMOS E CONDIÇÕES DE EMBARQUE',
    term1: '1. HORÁRIOS: O passageiro deve comparecer ao local de embarque com 30 minutos de antecedência. Atrasos podem resultar na perda do passeio sem direito a reembolso.',
    term2: '2. CONDIÇÕES CLIMÁTICAS: O passeio está sujeito às condições climáticas e do mar. Em caso de cancelamento por parte da empresa devido ao clima, será oferecida remarcação ou reembolso.',
    term3: '3. RESPONSABILIDADE: O passageiro é responsável por seus pertences pessoais. A empresa não se responsabiliza por perdas, danos ou furtos.',
    term4: '4. COMPORTAMENTO: É proibido o uso de drogas ilícitas, comportamento que coloque em risco a segurança dos demais passageiros ou tripulação. O descumprimento pode resultar em desembarque imediato.',
    term5: '5. SEGURANÇA: O passageiro deve seguir todas as orientações da tripulação. O uso de coletes salva-vidas é obrigatório quando solicitado.',
    term6: '6. CANCELAMENTO: Cancelamentos com menos de 24 horas de antecedência não terão direito a reembolso.',
    term7: '7. ALIMENTAÇÃO: É permitido levar alimentos e bebidas (não alcoólicas). Bebidas alcoólicas são permitidas com moderação.',
    term8: '8. CRIANÇAS: Menores de idade devem estar acompanhados por um responsável legal.',
    term9: '9. SAÚDE: Passageiros com problemas de saúde que possam ser agravados pelo passeio devem informar previamente à tripulação.',
    term10: '10. PRESERVAÇÃO: É proibido jogar lixo no mar. Contribua para a preservação ambiental.',
    // Termos de imagem
    imageTermsTitle: 'TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM',
    imageTermsIntro: 'Autorizo a empresa VIVA LA VIDA PASSEIOS a utilizar minha imagem, seja em foto ou vídeo, captada durante o passeio, para fins de divulgação institucional e comercial.',
    allowedUse: 'Uso permitido:',
    imageUse1: 'Redes sociais (Instagram, Facebook, TikTok)',
    imageUse2: 'Website da empresa',
    imageUse3: 'Material publicitário impresso e digital',
    imageUse4: 'Vídeos promocionais',
    imageTermsFree: 'Esta autorização é concedida a título gratuito, sem qualquer ônus para a empresa.',
    imageTermsNote: 'Obs: Caso não deseje autorizar, basta não marcar a opção abaixo. Isso não afetará sua participação no passeio.',
  },
  'en': {
    loading: 'Loading...',
    error: 'Error',
    invalidLink: 'Invalid link',
    notFound: 'Reservation not found',
    loadError: 'Error loading data. Please try again.',
    termsAccepted: 'Terms Accepted!',
    thankYou: 'Thank you',
    successMessage: 'Your terms have been successfully registered.',
    boatTerms: 'Boat usage terms:',
    accepted: 'Accepted',
    imageUsage: 'Image usage:',
    authorized: 'Authorized',
    voucherInfo: 'You will now receive your boarding voucher. Present it on the day of the tour.',
    confirmTerms: 'Terms Confirmation',
    toProceed: 'To proceed with your tour',
    passenger: 'Passenger',
    phone: 'Phone',
    tourDate: 'Tour Date',
    seat: 'Seat',
    groupLeader: 'Group Leader',
    acceptingFor: 'You are accepting the terms on behalf of',
    persons: 'person(s)',
    groupMembers: 'Group members:',
    boatTermsTitle: 'Boat Usage Terms',
    readRules: 'Read the tour rules',
    hide: 'Hide',
    viewTerms: 'View terms',
    iAcceptBoatTerms: 'I have read and accept the boat usage terms',
    agreeRules: 'I agree with all the rules and conditions of the tour.',
    imageAuthTitle: 'Image Usage Authorization',
    optional: 'Optional - for social media',
    iAuthorizeImage: 'I authorize the use of my image',
    optionalSocial: 'Optional - For social media publication.',
    confirmButton: 'Confirm and Accept Terms',
    saving: 'Saving...',
    legalNote: 'By confirming, your acceptance data will be recorded for legal purposes.',
    acceptTermsAlert: 'You must accept the boat usage terms to continue.',
    saveError: 'Error saving. Please try again.',
    termsTitle: 'BOARDING TERMS AND CONDITIONS',
    term1: '1. SCHEDULE: Passengers must arrive at the boarding location 30 minutes in advance. Delays may result in loss of the tour without refund.',
    term2: '2. WEATHER CONDITIONS: The tour is subject to weather and sea conditions. In case of cancellation by the company due to weather, rescheduling or refund will be offered.',
    term3: '3. RESPONSIBILITY: Passengers are responsible for their personal belongings. The company is not responsible for losses, damages or theft.',
    term4: '4. BEHAVIOR: Illicit drug use and behavior that endangers other passengers or crew is prohibited. Violation may result in immediate disembarkation.',
    term5: '5. SAFETY: Passengers must follow all crew instructions. Life jacket use is mandatory when requested.',
    term6: '6. CANCELLATION: Cancellations less than 24 hours in advance are not eligible for refund.',
    term7: '7. FOOD: Food and (non-alcoholic) beverages are allowed. Alcoholic beverages are permitted in moderation.',
    term8: '8. CHILDREN: Minors must be accompanied by a legal guardian.',
    term9: '9. HEALTH: Passengers with health conditions that may be aggravated by the tour must inform the crew in advance.',
    term10: '10. PRESERVATION: Throwing garbage in the sea is prohibited. Contribute to environmental preservation.',
    imageTermsTitle: 'IMAGE USAGE AUTHORIZATION TERM',
    imageTermsIntro: 'I authorize VIVA LA VIDA PASSEIOS to use my image, whether in photo or video, captured during the tour, for institutional and commercial purposes.',
    allowedUse: 'Allowed use:',
    imageUse1: 'Social media (Instagram, Facebook, TikTok)',
    imageUse2: 'Company website',
    imageUse3: 'Printed and digital advertising material',
    imageUse4: 'Promotional videos',
    imageTermsFree: 'This authorization is granted free of charge, without any cost to the company.',
    imageTermsNote: 'Note: If you do not wish to authorize, simply do not check the option below. This will not affect your participation in the tour.',
  },
  'es': {
    loading: 'Cargando...',
    error: 'Error',
    invalidLink: 'Enlace inválido',
    notFound: 'Reserva no encontrada',
    loadError: 'Error al cargar datos. Inténtalo de nuevo.',
    termsAccepted: '¡Términos Aceptados!',
    thankYou: 'Gracias',
    successMessage: 'Sus términos han sido registrados con éxito.',
    boatTerms: 'Términos de uso del barco:',
    accepted: 'Aceptado',
    imageUsage: 'Uso de imagen:',
    authorized: 'Autorizado',
    voucherInfo: 'Ahora recibirás tu voucher de embarque. Preséntalo el día del paseo.',
    confirmTerms: 'Confirmación de Términos',
    toProceed: 'Para continuar con tu paseo',
    passenger: 'Pasajero',
    phone: 'Teléfono',
    tourDate: 'Fecha del Paseo',
    seat: 'Asiento',
    groupLeader: 'Responsable del Grupo',
    acceptingFor: 'Estás aceptando los términos en nombre de',
    persons: 'persona(s)',
    groupMembers: 'Miembros del grupo:',
    boatTermsTitle: 'Términos de Uso del Barco',
    readRules: 'Lee las reglas del paseo',
    hide: 'Ocultar',
    viewTerms: 'Ver términos',
    iAcceptBoatTerms: 'He leído y acepto los términos de uso del barco',
    agreeRules: 'Acepto todas las reglas y condiciones del paseo.',
    imageAuthTitle: 'Autorización de Uso de Imagen',
    optional: 'Opcional - para redes sociales',
    iAuthorizeImage: 'Autorizo el uso de mi imagen',
    optionalSocial: 'Opcional - Para publicación en redes sociales.',
    confirmButton: 'Confirmar y Aceptar Términos',
    saving: 'Guardando...',
    legalNote: 'Al confirmar, tus datos de aceptación serán registrados con fines legales.',
    acceptTermsAlert: 'Debes aceptar los términos de uso del barco para continuar.',
    saveError: 'Error al guardar. Inténtalo de nuevo.',
    termsTitle: 'TÉRMINOS Y CONDICIONES DE EMBARQUE',
    term1: '1. HORARIOS: El pasajero debe presentarse en el lugar de embarque con 30 minutos de anticipación. Los retrasos pueden resultar en la pérdida del paseo sin derecho a reembolso.',
    term2: '2. CONDICIONES CLIMÁTICAS: El paseo está sujeto a las condiciones climáticas y del mar. En caso de cancelación por parte de la empresa debido al clima, se ofrecerá reprogramación o reembolso.',
    term3: '3. RESPONSABILIDAD: El pasajero es responsable de sus pertenencias personales. La empresa no se hace responsable de pérdidas, daños o robos.',
    term4: '4. COMPORTAMIENTO: Está prohibido el uso de drogas ilícitas y comportamientos que pongan en riesgo la seguridad de otros pasajeros o tripulación. El incumplimiento puede resultar en desembarque inmediato.',
    term5: '5. SEGURIDAD: El pasajero debe seguir todas las instrucciones de la tripulación. El uso de chalecos salvavidas es obligatorio cuando se solicite.',
    term6: '6. CANCELACIÓN: Las cancelaciones con menos de 24 horas de anticipación no tienen derecho a reembolso.',
    term7: '7. ALIMENTACIÓN: Se permite llevar alimentos y bebidas (no alcohólicas). Las bebidas alcohólicas están permitidas con moderación.',
    term8: '8. NIÑOS: Los menores de edad deben estar acompañados por un tutor legal.',
    term9: '9. SALUD: Los pasajeros con problemas de salud que puedan agravarse con el paseo deben informar previamente a la tripulación.',
    term10: '10. PRESERVACIÓN: Está prohibido tirar basura al mar. Contribuye a la preservación ambiental.',
    imageTermsTitle: 'TÉRMINO DE AUTORIZACIÓN DE USO DE IMAGEN',
    imageTermsIntro: 'Autorizo a VIVA LA VIDA PASSEIOS a utilizar mi imagen, ya sea en foto o video, capturada durante el paseo, con fines institucionales y comerciales.',
    allowedUse: 'Uso permitido:',
    imageUse1: 'Redes sociales (Instagram, Facebook, TikTok)',
    imageUse2: 'Sitio web de la empresa',
    imageUse3: 'Material publicitario impreso y digital',
    imageUse4: 'Videos promocionales',
    imageTermsFree: 'Esta autorización se concede de forma gratuita, sin ningún costo para la empresa.',
    imageTermsNote: 'Nota: Si no deseas autorizar, simplemente no marques la opción a continuación. Esto no afectará tu participación en el paseo.',
  },
  'de': {
    loading: 'Laden...',
    error: 'Fehler',
    invalidLink: 'Ungültiger Link',
    notFound: 'Reservierung nicht gefunden',
    loadError: 'Fehler beim Laden der Daten. Bitte versuchen Sie es erneut.',
    termsAccepted: 'Bedingungen Akzeptiert!',
    thankYou: 'Danke',
    successMessage: 'Ihre Bedingungen wurden erfolgreich registriert.',
    boatTerms: 'Nutzungsbedingungen des Bootes:',
    accepted: 'Akzeptiert',
    imageUsage: 'Bildnutzung:',
    authorized: 'Autorisiert',
    voucherInfo: 'Sie erhalten jetzt Ihren Boarding-Gutschein. Zeigen Sie ihn am Tag der Tour vor.',
    confirmTerms: 'Bestätigung der Bedingungen',
    toProceed: 'Um mit Ihrer Tour fortzufahren',
    passenger: 'Passagier',
    phone: 'Telefon',
    tourDate: 'Tourdatum',
    seat: 'Sitz',
    groupLeader: 'Gruppenleiter',
    acceptingFor: 'Sie akzeptieren die Bedingungen im Namen von',
    persons: 'Person(en)',
    groupMembers: 'Gruppenmitglieder:',
    boatTermsTitle: 'Nutzungsbedingungen des Bootes',
    readRules: 'Lesen Sie die Tourregeln',
    hide: 'Ausblenden',
    viewTerms: 'Bedingungen anzeigen',
    iAcceptBoatTerms: 'Ich habe die Nutzungsbedingungen des Bootes gelesen und akzeptiere sie',
    agreeRules: 'Ich stimme allen Regeln und Bedingungen der Tour zu.',
    imageAuthTitle: 'Bildnutzungsautorisierung',
    optional: 'Optional - für soziale Medien',
    iAuthorizeImage: 'Ich autorisiere die Nutzung meines Bildes',
    optionalSocial: 'Optional - Für die Veröffentlichung in sozialen Medien.',
    confirmButton: 'Bestätigen und Bedingungen Akzeptieren',
    saving: 'Speichern...',
    legalNote: 'Mit der Bestätigung werden Ihre Akzeptanzdaten für rechtliche Zwecke aufgezeichnet.',
    acceptTermsAlert: 'Sie müssen die Nutzungsbedingungen des Bootes akzeptieren, um fortzufahren.',
    saveError: 'Fehler beim Speichern. Bitte versuchen Sie es erneut.',
    termsTitle: 'BOARDING-BEDINGUNGEN',
    term1: '1. ZEITPLAN: Passagiere müssen 30 Minuten vor dem Einsteigen am Boarding-Ort erscheinen. Verspätungen können zum Verlust der Tour ohne Rückerstattung führen.',
    term2: '2. WETTERBEDINGUNGEN: Die Tour unterliegt den Wetter- und Seebedingungen. Bei Stornierung durch das Unternehmen aufgrund des Wetters wird eine Umbuchung oder Rückerstattung angeboten.',
    term3: '3. VERANTWORTUNG: Passagiere sind für ihre persönlichen Gegenstände verantwortlich. Das Unternehmen haftet nicht für Verluste, Schäden oder Diebstahl.',
    term4: '4. VERHALTEN: Der Gebrauch illegaler Drogen und Verhalten, das andere Passagiere oder die Besatzung gefährdet, ist verboten. Ein Verstoß kann zur sofortigen Ausschiffung führen.',
    term5: '5. SICHERHEIT: Passagiere müssen alle Anweisungen der Besatzung befolgen. Das Tragen von Rettungswesten ist auf Anfrage obligatorisch.',
    term6: '6. STORNIERUNG: Stornierungen weniger als 24 Stunden im Voraus haben keinen Anspruch auf Rückerstattung.',
    term7: '7. ESSEN: Essen und (alkoholfreie) Getränke sind erlaubt. Alkoholische Getränke sind in Maßen erlaubt.',
    term8: '8. KINDER: Minderjährige müssen von einem Erziehungsberechtigten begleitet werden.',
    term9: '9. GESUNDHEIT: Passagiere mit Gesundheitsproblemen, die durch die Tour verschlimmert werden könnten, müssen die Besatzung im Voraus informieren.',
    term10: '10. UMWELTSCHUTZ: Das Werfen von Müll ins Meer ist verboten. Tragen Sie zum Umweltschutz bei.',
    imageTermsTitle: 'BILDNUTZUNGSAUTORISIERUNG',
    imageTermsIntro: 'Ich autorisiere VIVA LA VIDA PASSEIOS, mein Bild, sei es als Foto oder Video, das während der Tour aufgenommen wurde, für institutionelle und kommerzielle Zwecke zu verwenden.',
    allowedUse: 'Erlaubte Nutzung:',
    imageUse1: 'Soziale Medien (Instagram, Facebook, TikTok)',
    imageUse2: 'Unternehmenswebsite',
    imageUse3: 'Gedrucktes und digitales Werbematerial',
    imageUse4: 'Werbevideos',
    imageTermsFree: 'Diese Autorisierung wird kostenlos erteilt, ohne Kosten für das Unternehmen.',
    imageTermsNote: 'Hinweis: Wenn Sie keine Autorisierung wünschen, aktivieren Sie einfach die Option unten nicht. Dies beeinträchtigt Ihre Teilnahme an der Tour nicht.',
  },
  'fr': {
    loading: 'Chargement...',
    error: 'Erreur',
    invalidLink: 'Lien invalide',
    notFound: 'Réservation non trouvée',
    loadError: 'Erreur lors du chargement des données. Veuillez réessayer.',
    termsAccepted: 'Conditions Acceptées !',
    thankYou: 'Merci',
    successMessage: 'Vos conditions ont été enregistrées avec succès.',
    boatTerms: 'Conditions d\'utilisation du bateau :',
    accepted: 'Accepté',
    imageUsage: 'Utilisation d\'image :',
    authorized: 'Autorisé',
    voucherInfo: 'Vous recevrez maintenant votre bon d\'embarquement. Présentez-le le jour de l\'excursion.',
    confirmTerms: 'Confirmation des Conditions',
    toProceed: 'Pour continuer avec votre excursion',
    passenger: 'Passager',
    phone: 'Téléphone',
    tourDate: 'Date de l\'Excursion',
    seat: 'Siège',
    groupLeader: 'Responsable du Groupe',
    acceptingFor: 'Vous acceptez les conditions au nom de',
    persons: 'personne(s)',
    groupMembers: 'Membres du groupe :',
    boatTermsTitle: 'Conditions d\'Utilisation du Bateau',
    readRules: 'Lisez les règles de l\'excursion',
    hide: 'Masquer',
    viewTerms: 'Voir les conditions',
    iAcceptBoatTerms: 'J\'ai lu et j\'accepte les conditions d\'utilisation du bateau',
    agreeRules: 'J\'accepte toutes les règles et conditions de l\'excursion.',
    imageAuthTitle: 'Autorisation d\'Utilisation d\'Image',
    optional: 'Optionnel - pour les réseaux sociaux',
    iAuthorizeImage: 'J\'autorise l\'utilisation de mon image',
    optionalSocial: 'Optionnel - Pour la publication sur les réseaux sociaux.',
    confirmButton: 'Confirmer et Accepter les Conditions',
    saving: 'Enregistrement...',
    legalNote: 'En confirmant, vos données d\'acceptation seront enregistrées à des fins légales.',
    acceptTermsAlert: 'Vous devez accepter les conditions d\'utilisation du bateau pour continuer.',
    saveError: 'Erreur lors de l\'enregistrement. Veuillez réessayer.',
    termsTitle: 'CONDITIONS GÉNÉRALES D\'EMBARQUEMENT',
    term1: '1. HORAIRES : Les passagers doivent arriver au lieu d\'embarquement 30 minutes à l\'avance. Les retards peuvent entraîner la perte de l\'excursion sans remboursement.',
    term2: '2. CONDITIONS MÉTÉOROLOGIQUES : L\'excursion est soumise aux conditions météorologiques et maritimes. En cas d\'annulation par l\'entreprise en raison du temps, une reprogrammation ou un remboursement sera proposé.',
    term3: '3. RESPONSABILITÉ : Les passagers sont responsables de leurs effets personnels. L\'entreprise n\'est pas responsable des pertes, dommages ou vols.',
    term4: '4. COMPORTEMENT : L\'usage de drogues illicites et les comportements mettant en danger les autres passagers ou l\'équipage sont interdits. La violation peut entraîner un débarquement immédiat.',
    term5: '5. SÉCURITÉ : Les passagers doivent suivre toutes les instructions de l\'équipage. Le port du gilet de sauvetage est obligatoire sur demande.',
    term6: '6. ANNULATION : Les annulations moins de 24 heures à l\'avance ne donnent pas droit à un remboursement.',
    term7: '7. NOURRITURE : La nourriture et les boissons (non alcoolisées) sont autorisées. Les boissons alcoolisées sont permises avec modération.',
    term8: '8. ENFANTS : Les mineurs doivent être accompagnés d\'un tuteur légal.',
    term9: '9. SANTÉ : Les passagers ayant des problèmes de santé pouvant être aggravés par l\'excursion doivent en informer l\'équipage à l\'avance.',
    term10: '10. PRÉSERVATION : Jeter des déchets dans la mer est interdit. Contribuez à la préservation de l\'environnement.',
    imageTermsTitle: 'TERME D\'AUTORISATION D\'UTILISATION D\'IMAGE',
    imageTermsIntro: 'J\'autorise VIVA LA VIDA PASSEIOS à utiliser mon image, que ce soit en photo ou en vidéo, capturée pendant l\'excursion, à des fins institutionnelles et commerciales.',
    allowedUse: 'Utilisation autorisée :',
    imageUse1: 'Réseaux sociaux (Instagram, Facebook, TikTok)',
    imageUse2: 'Site web de l\'entreprise',
    imageUse3: 'Matériel publicitaire imprimé et numérique',
    imageUse4: 'Vidéos promotionnelles',
    imageTermsFree: 'Cette autorisation est accordée gratuitement, sans frais pour l\'entreprise.',
    imageTermsNote: 'Note : Si vous ne souhaitez pas autoriser, il suffit de ne pas cocher l\'option ci-dessous. Cela n\'affectera pas votre participation à l\'excursion.',
  },
};

export default function AceitePage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [boat, setBoat] = useState<Boat | null>(null);
  const [groupMembers, setGroupMembers] = useState<Reservation[]>([]);
  const [language, setLanguage] = useState<SupportedLanguage>('pt-BR');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  
  // Helper de tradução
  const t = (key: string) => translations[language][key] || translations['pt-BR'][key] || key;
  
  // Estados dos checkboxes
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedImageRights, setAcceptedImageRights] = useState(false);
  
  // Expandir termos
  const [showTerms, setShowTerms] = useState(false);
  const [showImageTerms, setShowImageTerms] = useState(false);

  useEffect(() => {
    const loadReservation = async () => {
      const reservationId = params.id as string;
      
      if (!reservationId) {
        setError(translations['pt-BR']['invalidLink']);
        setLoading(false);
        return;
      }

      try {
        const db = getDb();
        // Buscar reserva
        const reservationDoc = await getDoc(doc(db, 'reservations', reservationId));
        
        if (!reservationDoc.exists()) {
          setError(translations['pt-BR']['notFound']);
          setLoading(false);
          return;
        }

        const reservationData = {
          id: reservationDoc.id,
          ...reservationDoc.data(),
          createdAt: reservationDoc.data().createdAt?.toDate(),
          updatedAt: reservationDoc.data().updatedAt?.toDate(),
        } as Reservation;

        // Verificar se já aceitou
        if (reservationData.acceptedTerms && reservationData.acceptedImageRights) {
          setSuccess(true);
          setReservation(reservationData);
          setLoading(false);
          return;
        }

        setReservation(reservationData);
        setAcceptedTerms(reservationData.acceptedTerms || false);
        setAcceptedImageRights(reservationData.acceptedImageRights || false);

        // Buscar barco
        if (reservationData.boatId) {
          const boatDoc = await getDoc(doc(db, 'boats', reservationData.boatId));
          if (boatDoc.exists()) {
            setBoat({
              id: boatDoc.id,
              ...boatDoc.data(),
            } as Boat);
          }
        }
        
        // Buscar membros do grupo se existir
        if (reservationData.groupId) {
          const groupQuery = query(
            collection(db, 'reservations'),
            where('groupId', '==', reservationData.groupId)
          );
          const groupSnapshot = await getDocs(groupQuery);
          const members = groupSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as Reservation[];
          setGroupMembers(members);
        }
      } catch (err) {
        console.error('Erro ao carregar reserva:', err);
        setError(translations['pt-BR']['loadError']);
      } finally {
        setLoading(false);
      }
    };

    loadReservation();
  }, [params.id]);

  const handleSubmit = async () => {
    if (!reservation) return;
    
    if (!acceptedTerms) {
      alert(t('acceptTermsAlert'));
      return;
    }

    setSubmitting(true);

    try {
      // Obter informações do dispositivo
      const userAgent = navigator.userAgent;
      
      // Tentar obter IP (via API externa)
      let clientIP = 'Não disponível';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        clientIP = ipData.ip;
      } catch {
        console.log('Não foi possível obter IP');
      }

      const now = Timestamp.now();
      const db = getDb();

      const updateData: Record<string, unknown> = {
        acceptedTerms: true,
        acceptedTermsAt: now,
        acceptedFromIP: clientIP,
        acceptedUserAgent: userAgent,
        acceptedImageRights: acceptedImageRights,
        acceptedImageRightsAt: acceptedImageRights ? now : null,
        updatedAt: now,
      };

      // Atualiza a reserva atual + todos os membros do grupo num único batch.
      // Se algum falhar, ninguém é atualizado — evita estado parcial.
      const batch = writeBatch(db);
      batch.update(doc(db, 'reservations', reservation.id), updateData);

      if (reservation.groupId) {
        const groupQuery = query(
          collection(db, 'reservations'),
          where('groupId', '==', reservation.groupId)
        );
        const groupSnapshot = await getDocs(groupQuery);
        groupSnapshot.docs.forEach((docSnapshot) => {
          if (docSnapshot.id !== reservation.id) {
            batch.update(doc(db, 'reservations', docSnapshot.id), updateData);
          }
        });
      }

      await batch.commit();

      setSuccess(true);
    } catch (err) {
      console.error('Erro ao salvar aceite:', err);
      alert(t('saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return dateString;
    const date = new Date(year, month - 1, day, 12, 0, 0);
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Componente de seletor de idioma
  const LanguageSelector = () => (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => setShowLanguageMenu(!showLanguageMenu)}
        className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-md border border-gray-200 hover:bg-gray-50 transition"
      >
        <Globe size={18} className="text-gray-600" />
        <span className="text-sm font-medium">{LANGUAGES.find(l => l.code === language)?.flag}</span>
      </button>
      {showLanguageMenu && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden min-w-[160px]">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setShowLanguageMenu(false);
              }}
              className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 transition ${
                language === lang.code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <LanguageSelector />
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-blue-600 mb-4" size={48} />
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
        <LanguageSelector />
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-red-200 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-red-600" size={32} />
          </div>
          <h1 className="text-xl font-bold text-red-800 mb-2">{t('error')}</h1>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <LanguageSelector />
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-green-200 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-green-600" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-green-800 mb-2">{t('termsAccepted')}</h1>
          <p className="text-green-600 mb-6">
            {t('thankYou')}, {reservation?.customerName?.split(' ')[0]}! {t('successMessage')}
          </p>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left">
            <p className="text-sm text-green-800">
              <span className="font-semibold">✓ {t('boatTerms')}</span> {t('accepted')}
            </p>
            {reservation?.acceptedImageRights && (
              <p className="text-sm text-green-800 mt-1">
                <span className="font-semibold">✓ {t('imageUsage')}</span> {t('authorized')}
              </p>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-6">
            {t('voucherInfo')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <LanguageSelector />
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Ship className="text-blue-600" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">VIVA LA VIDA</h1>
          <p className="text-gray-600">Ilha do Campeche • Florianópolis</p>
        </div>

        {/* Card de informações do passeio */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
            <h2 className="font-bold text-lg">{t('confirmTerms')}</h2>
            <p className="text-blue-100 text-sm">{t('toProceed')}</p>
          </div>
          
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <User size={18} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">{t('passenger')}</p>
                <p className="font-semibold text-gray-800">{reservation?.customerName}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Phone size={18} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">{t('phone')}</p>
                <p className="font-semibold text-gray-800">{reservation?.phone}</p>
              </div>
            </div>
            
            {boat && (
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">{t('tourDate')}</p>
                  <p className="font-semibold text-gray-800 capitalize">{formatDate(boat.date)}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Ship size={18} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">{t('seat')}</p>
                <p className="font-semibold text-gray-800">#{reservation?.seatNumber}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Informações do Grupo */}
        {groupMembers.length > 1 && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="text-blue-600" size={16} />
              </div>
              <div>
                <p className="font-bold text-blue-800">{t('groupLeader')}</p>
                <p className="text-xs text-blue-600">{t('acceptingFor')} {groupMembers.length} {t('persons')}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 border border-blue-100">
              <p className="text-xs text-gray-500 mb-2">{t('groupMembers')}</p>
              <div className="space-y-1">
                {groupMembers.map((member, index) => (
                  <p key={member.id} className="text-sm text-gray-700">
                    {index + 1}. {member.customerName}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Termos */}
        <div className="space-y-4 mb-8">
          {/* Termos de Uso do Barco */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTerms(!showTerms)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="text-blue-600" size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-800">{t('boatTermsTitle')}</p>
                  <p className="text-sm text-gray-500">{t('readRules')}</p>
                </div>
              </div>
              <span className="text-blue-600 text-sm font-semibold">
                {showTerms ? t('hide') : t('viewTerms')}
              </span>
            </button>
            
            {showTerms && (
              <div className="px-4 pb-4">
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-3 max-h-64 overflow-y-auto border border-gray-200">
                  <p className="font-bold text-gray-800">{t('termsTitle')}</p>
                  
                  <p>{t('term1')}</p>
                  <p>{t('term2')}</p>
                  <p>{t('term3')}</p>
                  <p>{t('term4')}</p>
                  <p>{t('term5')}</p>
                  <p>{t('term6')}</p>
                  <p>{t('term7')}</p>
                  <p>{t('term8')}</p>
                  <p>{t('term9')}</p>
                  <p>{t('term10')}</p>
                </div>
              </div>
            )}
            
            <div className="px-4 pb-4">
              <label className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200 cursor-pointer hover:bg-blue-100 transition">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="w-5 h-5 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  <strong className="text-blue-800">{t('iAcceptBoatTerms')}</strong>
                  <br />
                  <span className="text-gray-500">{t('agreeRules')}</span>
                </span>
              </label>
            </div>
          </div>

          {/* Uso de Imagem */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowImageTerms(!showImageTerms)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Camera className="text-purple-600" size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-800">{t('imageAuthTitle')}</p>
                  <p className="text-sm text-gray-500">{t('optional')}</p>
                </div>
              </div>
              <span className="text-purple-600 text-sm font-semibold">
                {showImageTerms ? t('hide') : t('viewTerms')}
              </span>
            </button>
            
            {showImageTerms && (
              <div className="px-4 pb-4">
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-3 max-h-48 overflow-y-auto border border-gray-200">
                  <p className="font-bold text-gray-800">{t('imageTermsTitle')}</p>
                  
                  <p>{t('imageTermsIntro')}</p>
                  
                  <p><strong>{t('allowedUse')}</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>{t('imageUse1')}</li>
                    <li>{t('imageUse2')}</li>
                    <li>{t('imageUse3')}</li>
                    <li>{t('imageUse4')}</li>
                  </ul>
                  
                  <p>{t('imageTermsFree')}</p>
                  
                  <p><em>{t('imageTermsNote')}</em></p>
                </div>
              </div>
            )}
            
            <div className="px-4 pb-4">
              <label className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl border border-purple-200 cursor-pointer hover:bg-purple-100 transition">
                <input
                  type="checkbox"
                  checked={acceptedImageRights}
                  onChange={(e) => setAcceptedImageRights(e.target.checked)}
                  className="w-5 h-5 mt-0.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">
                  <strong className="text-purple-800">{t('iAuthorizeImage')}</strong>
                  <br />
                  <span className="text-gray-500">{t('optionalSocial')}</span>
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Botão de Confirmar */}
        <button
          onClick={handleSubmit}
          disabled={!acceptedTerms || submitting}
          className={`w-full py-4 rounded-xl font-bold text-lg transition flex items-center justify-center gap-2 ${
            acceptedTerms
              ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:shadow-lg active:scale-[0.98]'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              {t('saving')}
            </>
          ) : (
            <>
              <CheckCircle size={20} />
              {t('confirmButton')}
            </>
          )}
        </button>

        <p className="text-center text-xs text-gray-500 mt-4">
          {t('legalNote')}
        </p>
      </div>
    </div>
  );
}

