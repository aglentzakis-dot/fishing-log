/* Fish IQ — τι παίρνει ο παραλήπτης «Μεταφορά στοιχείων» (metafora-lipsi.js) από την παλιά διεύθυνση
   aglentzakis-dot.github.io/fishing-log/ → fishiq.glenapps.gr.
   © 2026 Ανδρέας Μ. Γλεντζάκης (Andreas M. Glentzakis). Με την επιφύλαξη παντός δικαιώματος. All rights reserved.
   ls   : όλα τα κλειδιά της εφαρμογής ξεκινούν με «psarema_» (ψαριές, τοποθεσίες, ψαράδες, είδη, δολώματα,
          τεχνικές, εμφάνιση, ρυθμίσεις αντιγράφων, κλειδιά αναγνώρισης ψαριών, γλώσσα, αρχείο σφαλμάτων)
   idb  : «psaremaDB» (φωτογραφίες ψαριών και φωτογραφία κεφαλίδας)
   opfs : καμία — η εφαρμογή δεν χρησιμοποιεί την ιδιωτική μνήμη αρχείων
   Ο φάκελος αντιγράφων του κινητού («shared-backups») ΔΕΝ μεταφέρεται: ξαναδιαλέγεται στη νέα διεύθυνση.
   Η εφαρμογή δεν διαβάζει το κοινό κλειδί Pro («glenapps-kleidi»).
   exei : αν εδώ υπάρχουν ήδη πραγματικές ψαριές ή τοποθεσίες (για την προειδοποίηση πριν από την αντικατάσταση). */
window.GLEN_METAFORA={app:"fishiq",onoma:"Fish IQ",
  ls:["psarema_"],
  idb:["psaremaDB"],
  opfs:[],
  exei:function(){try{return["psarema_entries","psarema_locations"].some(function(k){var v=localStorage.getItem(k);if(!v)return false;var d=JSON.parse(v);return Array.isArray(d)&&d.length>0})}catch(e){return true}}};
