CREATE TABLE aeroportis (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    latitude_deg DECIMAL(10, 6),
    longitude_deg DECIMAL(10, 6),
    ville_id INT,
    FOREIGN KEY (ville_id) REFERENCES villes(id)
);

-- Insérer les données des aéroports avec les coordonnées des villes correspondantes
INSERT INTO aeroportis (id, name, latitude_deg, longitude_deg, ville_id)
SELECT 
    a.id, 
    a.name, 
    v.latitude_deg, 
    v.longitude_deg,
    v.id as ville_id
FROM (
    -- Sous-requête avec toutes les données d'aéroports
    SELECT 3040 as id, 'Ndjili' as name, 'Ndjili' as ville_name UNION ALL
    SELECT 3059, 'Lubumbashi', 'Lubumbashi' UNION ALL
    SELECT 3057, 'Goma', 'Goma' UNION ALL
    SELECT 3061, 'Kalemie', 'Kalemie' UNION ALL
    SELECT 3063, 'Kananga', 'Kananga' UNION ALL
    SELECT 3052, 'Bangoka', 'Kisangani Simisini' UNION ALL
    SELECT 3056, 'Bukavu Kavumu', 'Bukavu' UNION ALL
    SELECT 3054, 'Bunia', 'Bunia' UNION ALL
    SELECT 3058, 'Kindu', 'Kindu' UNION ALL
    SELECT 3064, 'Mbuji Mayi', 'Mbuji Mayi' UNION ALL
    SELECT 3041, 'Ndolo', 'Kinshasa' UNION ALL
    SELECT 3042, 'Muanda', 'Muanda' UNION ALL
    SELECT 30780, 'Beni', 'Beni' UNION ALL
    SELECT 3060, 'Kolwezi', 'Kolwezi' UNION ALL
    SELECT 3062, 'Kamina', 'Kamina' UNION ALL
    SELECT 42423, 'Wageni', 'Beni' UNION ALL
    SELECT 3048, 'Gemena', 'Gemena' UNION ALL
    SELECT 3053, 'Matari', 'Isiro' UNION ALL
    SELECT 3045, 'Kikwit', 'Kikwit' UNION ALL
    SELECT 3046, 'Mbandaka', 'Mbandaka' UNION ALL
    SELECT 31827, 'Lodja', 'Lodja' UNION ALL
    SELECT 31877, 'Tshimpi', 'Matadi' UNION ALL
    SELECT 31455, 'Kamina City', 'Kamina' UNION ALL
    SELECT 3051, 'Kisangani Simisini', 'Kisangani' UNION ALL
    SELECT 31727, 'Kabalo', 'Kabalo' UNION ALL
    SELECT 31429, 'Kasongo', 'Kasongo' UNION ALL
    SELECT 31416, 'Katale', 'Goma' UNION ALL
    SELECT 31395, 'Katende', 'Kananga' UNION ALL
    SELECT 31414, 'Kimano Ii', 'Bukavu' UNION ALL
    SELECT 31767, 'Kongolo', 'Kongolo' UNION ALL
    SELECT 31396, 'Lokutu', 'Kisangani' UNION ALL
    SELECT 31929, 'Manono', 'Manono' UNION ALL
    SELECT 30693, 'Moba', 'Moba' UNION ALL
    SELECT 31427, 'Moga', 'Bukavu' UNION ALL
    SELECT 31411, 'Mulungu', 'Bukavu' UNION ALL
    SELECT 31469, 'Mutoto', 'Mbuji Mayi' UNION ALL
    SELECT 31493, 'Mwene-Ditu', 'Mbuji Mayi' UNION ALL
    SELECT 32178, 'Punia', 'Kindu' UNION ALL
    SELECT 31417, 'Rutshuru', 'Goma' UNION ALL
    SELECT 31457, 'Sandoa', 'Sandoa' UNION ALL
    SELECT 31415, 'Shabunda', 'Bukavu' UNION ALL
    SELECT 3044, 'Bandundu', 'Bandundu' UNION ALL
    SELECT 3047, 'Gbadolite', 'Gbadolite' UNION ALL
    SELECT 344674, 'Boma Lukandu', 'Boma' UNION ALL
    SELECT 3055, 'Buta Zega', 'Buta' UNION ALL
    SELECT 3050, 'Lisala', 'Lisala' UNION ALL
    SELECT 30796, 'Basankusu', 'Basankusu' UNION ALL
    SELECT 30783, 'Boma', 'Boma' UNION ALL
    SELECT 32156, 'Ilebo', 'Ilebo' UNION ALL
    SELECT 31679, 'Inongo', 'Inongo' UNION ALL
    SELECT 31775, 'Kiri', 'Kiri' UNION ALL
    SELECT 32030, 'Nioki', 'Nioki' UNION ALL
    SELECT 32478, 'Tshikapa', 'Tshikapa' UNION ALL
    SELECT 31484, 'Tshumbe', 'Tshumbe' UNION ALL
    SELECT 30779, 'Boende', 'Boende' UNION ALL
    SELECT 525297, 'Tembo', 'Tembo' UNION ALL
    SELECT 31400, 'Aba', 'Aba' UNION ALL
    SELECT 31371, 'Abumumbazi', 'Kisangani' UNION ALL
    SELECT 31409, 'Aketi', 'Aketi' UNION ALL
    SELECT 31410, 'Ango', 'Ango' UNION ALL
    SELECT 319271, 'Aru', 'Aru' UNION ALL
    SELECT 31405, 'Bambili-Dingila', 'Bambili' UNION ALL
    SELECT 31329, 'Banga', 'Banga' UNION ALL
    SELECT 31331, 'Banza Lute', 'Banza' UNION ALL
    SELECT 31326, 'Basengele', 'Basengele' UNION ALL
    SELECT 30676, 'Basongo', 'Basongo' UNION ALL
    SELECT 31372, 'Bau', 'Bau' UNION ALL
    SELECT 31488, 'Bena-Dibele', 'Bena' UNION ALL
    SELECT 31313, 'Beno', 'Beno' UNION ALL
    SELECT 31365, 'Beongo', 'Beongo' UNION ALL
    SELECT 31492, 'Bibanga', 'Bibanga' UNION ALL
    SELECT 31311, 'Bikoro', 'Bikoro' UNION ALL
    SELECT 31322, 'Bindja', 'Bindja' UNION ALL
    SELECT 31386, 'Binga', 'Binga' UNION ALL
    SELECT 333214, 'Boeli Airstrip', 'Boeli' UNION ALL
    SELECT 31373, 'Bokada', 'Bokada' UNION ALL
    SELECT 31357, 'Bokela', 'Bokela' UNION ALL
    SELECT 31333, 'Boko', 'Boko' UNION ALL
    SELECT 322991, 'Bokoro', 'Bokoro' UNION ALL
    SELECT 31387, 'Bokungu', 'Bokungu' UNION ALL
    SELECT 31385, 'Bolila', 'Bolila' UNION ALL
    SELECT 344677, 'Bolobo', 'Bolobo' UNION ALL
    SELECT 31321, 'Bolongonkele', 'Bolongonkele' UNION ALL
    SELECT 318423, 'Bondo', 'Bondo' UNION ALL
    SELECT 31310, 'Bongimba', 'Bongimba' UNION ALL
    SELECT 31314, 'Bonkita', 'Bonkita' UNION ALL
    SELECT 31318, 'Boshwe', 'Boshwe' UNION ALL
    SELECT 31384, 'Bosondjo', 'Bosondjo' UNION ALL
    SELECT 31391, 'Boteka', 'Boteka' UNION ALL
    SELECT 31448, 'Bukena', 'Bukena' UNION ALL
    SELECT 31468, 'Bulape', 'Bulape' UNION ALL
    SELECT 31413, 'Bulongo Kigogo', 'Bulongo' UNION ALL
    SELECT 30773, 'Bumba', 'Bumba' UNION ALL
    SELECT 31335, 'Busala', 'Busala' UNION ALL
    SELECT 308150, 'Rughenda Airfield', 'Beni' UNION ALL
    SELECT 31299, 'Celo Zongo', 'Celo' UNION ALL
    SELECT 333215, 'Dakwa', 'Dakwa' UNION ALL
    SELECT 31490, 'Dekese', 'Dekese' UNION ALL
    SELECT 31472, 'Diboko', 'Diboko' UNION ALL
    SELECT 31489, 'Dikungu', 'Dikungu' UNION ALL
    SELECT 31459, 'Dilolo', 'Dilolo' UNION ALL
    SELECT 31479, 'Dingele', 'Dingele' UNION ALL
    SELECT 31319, 'Djokele', 'Djokele' UNION ALL
    SELECT 318342, 'Djolu', 'Djolu' UNION ALL
    SELECT 31397, 'Doko', 'Doko' UNION ALL
    SELECT 31399, 'Doruma', 'Doruma' UNION ALL
    SELECT 31398, 'Dungu-Uye', 'Dungu' UNION ALL
    SELECT 318425, 'Dungu', 'Dungu' UNION ALL
    SELECT 31370, 'Engengele', 'Engengele' UNION ALL
    SELECT 319269, 'Epulu', 'Epulu' UNION ALL
    SELECT 31402, 'Faradje', 'Faradje' UNION ALL
    SELECT 31337, 'Fatundu', 'Fatundu' UNION ALL
    SELECT 31438, 'Fungurume', 'Fungurume' UNION ALL
    SELECT 31382, 'Gbado', 'Gbado' UNION ALL
    SELECT 31375, 'Goyongo', 'Goyongo' UNION ALL
    SELECT 31383, 'Gwaka', 'Gwaka' UNION ALL
    SELECT 31665, 'Idiofa', 'Idiofa' UNION ALL
    SELECT 31491, 'Idumbe', 'Idumbe' UNION ALL
    SELECT 31671, 'Ikela', 'Ikela' UNION ALL
    SELECT 31369, 'Imesse', 'Imesse' UNION ALL
    SELECT 31303, 'Inga', 'Inga' UNION ALL
    SELECT 31363, 'Ingende', 'Ingende' UNION ALL
    SELECT 31305, 'Inkisi', 'Inkisi' UNION ALL
    SELECT 31324, 'Ipeke', 'Ipeke' UNION ALL
    SELECT 523155, 'Ipope Airstrip', 'Ipope' UNION ALL
    SELECT 352980, 'Irebu', 'Irebu' UNION ALL
    SELECT 319272, 'Ishango', 'Ishango' UNION ALL
    SELECT 31419, 'Ishasha', 'Ishasha' UNION ALL
    SELECT 31316, 'Isongo', 'Isongo' UNION ALL
    SELECT 31338, 'Ito', 'Ito' UNION ALL
    SELECT 31394, 'KM 95 CFL', 'Kindu' UNION ALL
    SELECT 31726, 'Tunta', 'Tunta' UNION ALL
    SELECT 31447, 'Kabombo', 'Kabombo' UNION ALL
    SELECT 505668, 'Kabuba', 'Kabuba' UNION ALL
    SELECT 31328, 'Kahemba', 'Kahemba' UNION ALL
    SELECT 31430, 'Kailo', 'Kailo' UNION ALL
    SELECT 31330, 'Kajiji', 'Kajiji' UNION ALL
    SELECT 31376, 'Kala', 'Kala' UNION ALL
    SELECT 31759, 'Kinkungwa', 'Kinkungwa' UNION ALL
    SELECT 42425, 'Kamisuku', 'Kamisuku' UNION ALL
    SELECT 31477, 'Kalonda', 'Kalonda' UNION ALL
    SELECT 31440, 'Kamatanda', 'Kamatanda' UNION ALL
    SELECT 31435, 'Kamituga', 'Kamituga' UNION ALL
    SELECT 31424, 'Kampene', 'Kampene' UNION ALL
    SELECT 31458, 'Kanene', 'Kanene' UNION ALL
    SELECT 31764, 'Kaniama', 'Kaniama' UNION ALL
    SELECT 31451, 'Kansimba', 'Kansimba' UNION ALL
    SELECT 31716, 'Kapanga', 'Kapanga' UNION ALL
    SELECT 31380, 'Karawa', 'Karawa' UNION ALL
    SELECT 31460, 'Kasaji', 'Kasaji' UNION ALL
    SELECT 31739, 'Kasenga', 'Kasenga' UNION ALL
    SELECT 31462, 'Kasese Kaniama', 'Kasese' UNION ALL
    SELECT 31433, 'Kasese', 'Kasese' UNION ALL
    SELECT 31495, 'Kashia', 'Kashia' UNION ALL
    SELECT 300208, 'Kashobwe', 'Kashobwe' UNION ALL
    SELECT 31464, 'Kasonga', 'Kasonga' UNION ALL
    SELECT 511665, 'Kasongo-Lunda', 'Kasongo' UNION ALL
    SELECT 31482, 'Katako''kombe', 'Katako' UNION ALL
    SELECT 31420, 'Katanda Rusthuru', 'Katanda' UNION ALL
    SELECT 31454, 'Luvua', 'Luvua' UNION ALL
    SELECT 31475, 'Katubwe', 'Katubwe' UNION ALL
    SELECT 31439, 'Katwe', 'Katwe' UNION ALL
    SELECT 31315, 'Kempa', 'Kempa' UNION ALL
    SELECT 31325, 'Kutu-Kempili', 'Kutu' UNION ALL
    SELECT 31336, 'Kenge', 'Kenge' UNION ALL
    SELECT 31404, 'Kere Kere', 'Kere' UNION ALL
    SELECT 31425, 'Kiapupe', 'Kiapupe' UNION ALL
    SELECT 352981, 'Kibombo', 'Kibombo' UNION ALL
    SELECT 31339, 'Kikongo Sur Wamba', 'Kikongo' UNION ALL
    SELECT 31407, 'Kilomines', 'Kilomines' UNION ALL
    SELECT 313424, 'Kilwa', 'Kilwa' UNION ALL
    SELECT 31340, 'Kimafu', 'Kimafu' UNION ALL
    SELECT 31343, 'Kimbau', 'Kimbau' UNION ALL
    SELECT 31360, 'Kimpangu', 'Kimpangu' UNION ALL
    SELECT 31300, 'Kimpoko', 'Kimpoko' UNION ALL
    SELECT 31350, 'Kipata Katika', 'Kipata' UNION ALL
    SELECT 31494, 'Kipushi', 'Kipushi' UNION ALL
    SELECT 31443, 'Kisenge', 'Kisenge' UNION ALL
    SELECT 31497, 'Kisengwa', 'Kisengwa' UNION ALL
    SELECT 3043, 'Kitona', 'Kitona' UNION ALL
    SELECT 31367, 'Kodoro', 'Kodoro' UNION ALL
    SELECT 31478, 'Kole Sur Lukenie', 'Kole' UNION ALL
    SELECT 31351, 'Kolokoso', 'Kolokoso' UNION ALL
    SELECT 31306, 'Konde', 'Konde' UNION ALL
    SELECT 3049, 'Kotakoli Airbase', 'Kotakoli' UNION ALL
    SELECT 505669, 'Kutu-Ville', 'Kutu' UNION ALL
    SELECT 31481, 'Kutusongo', 'Kutusongo' UNION ALL
    SELECT 31307, 'Kwilu-Ngongo', 'Kwilu' UNION ALL
    SELECT 31825, 'Libenge', 'Libenge' UNION ALL
    SELECT 352947, 'Lodja Catholic Mission', 'Lodja' UNION ALL
    SELECT 31377, 'Lombo', 'Lombo' UNION ALL
    SELECT 31480, 'Lomela', 'Lomela' UNION ALL
    SELECT 31498, 'Lubao', 'Lubao' UNION ALL
    SELECT 31418, 'Lubero', 'Lubero' UNION ALL
    SELECT 31463, 'Lubondaie', 'Lubondaie' UNION ALL
    SELECT 505671, 'Lubondaie', 'Lubondaie' UNION ALL
    SELECT 31444, 'Lubudi', 'Lubudi' UNION ALL
    SELECT 31470, 'Luebo', 'Luebo' UNION ALL
    SELECT 31461, 'Luena', 'Luena' UNION ALL
    SELECT 31436, 'Lugushwa', 'Lugushwa' UNION ALL
    SELECT 31308, 'Luheki', 'Luheki' UNION ALL
    SELECT 31873, 'Luiza', 'Luiza' UNION ALL
    SELECT 31304, 'Lukala', 'Lukala' UNION ALL
    SELECT 31485, 'Lukombe-Batwa', 'Lukombe' UNION ALL
    SELECT 31426, 'Lulingu Tshionka', 'Lulingu' UNION ALL
    SELECT 31403, 'Luniemu', 'Luniemu' UNION ALL
    SELECT 31875, 'Luozi', 'Luozi' UNION ALL
    SELECT 31797, 'Lusambo', 'Lusambo' UNION ALL
    SELECT 31863, 'Lusanga', 'Lusanga' UNION ALL
    SELECT 31452, 'Lusinga', 'Lusinga' UNION ALL
    SELECT 31476, 'Lutshatsha', 'Lutshatsha' UNION ALL
    SELECT 31406, 'Mahagi', 'Mahagi' UNION ALL
    SELECT 31342, 'Malanga', 'Malanga' UNION ALL
    SELECT 31320, 'Malebo', 'Malebo' UNION ALL
    SELECT 344676, 'Maluku Airstrip', 'Maluku' UNION ALL
    SELECT 318427, 'Mambasa', 'Mambasa' UNION ALL
    SELECT 31332, 'Mangai Ii', 'Mangai' UNION ALL
    SELECT 31352, 'Masamuna', 'Masamuna' UNION ALL
    SELECT 31957, 'Masi Manimba', 'Masi' UNION ALL
    SELECT 31359, 'Matari', 'Matari' UNION ALL
    SELECT 31356, 'Mazelele', 'Mazelele' UNION ALL
    SELECT 31466, 'Mboi', 'Mboi' UNION ALL
    SELECT 31366, 'Mentole', 'Mentole' UNION ALL
    SELECT 31361, 'Missayi', 'Missayi' UNION ALL
    SELECT 31445, 'Mitwaba', 'Mitwaba' UNION ALL
    SELECT 31354, 'Moanza', 'Moanza' UNION ALL
    SELECT 31374, 'Mokaria-Yamoleka', 'Mokaria' UNION ALL
    SELECT 31465, 'Moma', 'Moma' UNION ALL
    SELECT 31379, 'Mombongo', 'Mombongo' UNION ALL
    SELECT 31388, 'Mondombe', 'Mondombe' UNION ALL
    SELECT 319230, 'Monga', 'Monga' UNION ALL
    SELECT 318428, 'Mongbwalu', 'Mongbwalu' UNION ALL
    SELECT 31353, 'Mongo Wa Kenda', 'Mongo' UNION ALL
    SELECT 31362, 'Monieka', 'Monieka' UNION ALL
    SELECT 31392, 'Monkoto', 'Monkoto' UNION ALL
    SELECT 31378, 'Mpaka', 'Mpaka' UNION ALL
    SELECT 31467, 'Muambi', 'Muambi' UNION ALL
    SELECT 31355, 'Mukedi', 'Mukedi' UNION ALL
    SELECT 31446, 'Mukoy', 'Mukoy' UNION ALL
    SELECT 352983, 'Mulongo', 'Mulongo' UNION ALL
    SELECT 31437, 'Mulungwishi', 'Mulungwishi' UNION ALL
    SELECT 31496, 'Munkamba', 'Munkamba' UNION ALL
    SELECT 31471, 'Musese', 'Musese' UNION ALL
    SELECT 31317, 'Mushie', 'Mushie' UNION ALL
    SELECT 31349, 'Mutena', 'Mutena' UNION ALL
    SELECT 31442, 'Mutshatsha', 'Mutshatsha' UNION ALL
    SELECT 31309, 'Mvula Sanda', 'Mvula' UNION ALL
    SELECT 31441, 'Mwadingusha', 'Mwadingusha' UNION ALL
    SELECT 31891, 'Mweka', 'Mweka' UNION ALL
    SELECT 32033, 'N''Kolo-Fuma', 'Nkolo' UNION ALL
    SELECT 315128, 'Nagero', 'Nagero' UNION ALL
    SELECT 333218, 'Nebobongo', 'Nebobongo' UNION ALL
    SELECT 31521, 'Ngandajika', 'Ngandajika' UNION ALL
    SELECT 31348, 'Ngi', 'Ngi' UNION ALL
    SELECT 31368, 'Ngumu', 'Ngumu' UNION ALL
    SELECT 319270, 'Nia-Nia', 'Nia' UNION ALL
    SELECT 31301, 'Nsangi', 'Nsangi' UNION ALL
    SELECT 31347, 'Nyanga', 'Nyanga' UNION ALL
    SELECT 318429, 'Nyankunde', 'Nyankunde' UNION ALL
    SELECT 31453, 'Nyunzu', 'Nyunzu' UNION ALL
    SELECT 31346, 'Nzamba', 'Nzamba' UNION ALL
    SELECT 31412, 'Nzovu', 'Nzovu' UNION ALL
    SELECT 31421, 'Obaye', 'Obaye' UNION ALL
    SELECT 31428, 'Obokote', 'Obokote' UNION ALL
    SELECT 31312, 'Oshwe', 'Oshwe' UNION ALL
    SELECT 505667, 'Pelende', 'Pelende' UNION ALL
    SELECT 31450, 'Pepa', 'Pepa' UNION ALL
    SELECT 31434, 'Phibraki', 'Phibraki' UNION ALL
    SELECT 318343, 'Pimu', 'Pimu' UNION ALL
    SELECT 319028, 'Poko', 'Poko' UNION ALL
    SELECT 31334, 'Popokabaka', 'Popokabaka' UNION ALL
    SELECT 31431, 'Punia-Basenge', 'Punia' UNION ALL
    SELECT 32182, 'Former Pweto', 'Pweto' UNION ALL
    SELECT 525974, 'Pweto', 'Pweto' UNION ALL
    SELECT 31422, 'Rwindi', 'Rwindi' UNION ALL
    SELECT 31432, 'Saulia', 'Saulia' UNION ALL
    SELECT 31323, 'Semendwa', 'Semendwa' UNION ALL
    SELECT 31483, 'Shongamba', 'Shongamba' UNION ALL
    SELECT 31449, 'Sominka', 'Sominka' UNION ALL
    SELECT 31456, 'Songa', 'Songa' UNION ALL
    SELECT 31381, 'Tandala', 'Tandala' UNION ALL
    SELECT 31423, 'Tingi-Tingi', 'Tingi' UNION ALL
    SELECT 31345, 'Tono', 'Tono' UNION ALL
    SELECT 31302, 'Tshela', 'Tshela' UNION ALL
    SELECT 31473, 'Tshibala', 'Tshibala' UNION ALL
    SELECT 31474, 'Tshikaji', 'Tshikaji' UNION ALL
    SELECT 322990, 'Tshimpumpu', 'Tshimpumpu' UNION ALL
    SELECT 31327, 'Vanga', 'Vanga' UNION ALL
    SELECT 31344, 'Wamba Luadi', 'Wamba' UNION ALL
    SELECT 31486, 'Wasolo', 'Wasolo' UNION ALL
    SELECT 31401, 'Watsa', 'Watsa' UNION ALL
    SELECT 31389, 'Wema', 'Wema' UNION ALL
    SELECT 31487, 'Wembo-Nyama', 'Wembo' UNION ALL
    SELECT 318424, 'Yakoma', 'Yakoma' UNION ALL
    SELECT 31390, 'Yalingimba', 'Yalingimba' UNION ALL
    SELECT 32716, 'Yangambi', 'Yangambi' UNION ALL
    SELECT 31358, 'Yasa Bongo', 'Yasa' UNION ALL
    SELECT 31408, 'Yedi', 'Yedi' UNION ALL
    SELECT 31364, 'Yembe Moke', 'Yembe' UNION ALL
    SELECT 31393, 'Yemo', 'Yemo' UNION ALL
    SELECT 31341, 'Yuki', 'Yuki' UNION ALL
    SELECT 318426, 'Zaniwe', 'Zaniwe' UNION ALL
    SELECT 42424, 'Isiro-Ville', 'Isiro' UNION ALL
    SELECT 345909, 'Kamoa Mine Heliport', 'Kamoa' UNION ALL
    SELECT 505672, 'Mbulungu', 'Mbulungu'
) a
LEFT JOIN villes v ON v.name = a.ville_name;