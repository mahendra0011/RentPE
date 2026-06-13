export const CITY_STORAGE_KEY = "rentpe:selected-city";

export const allCitiesOption = {
  city: "",
  state: "",
  label: "Select city",
  shortLabel: "",
};

const indiaCityList = [
  { city: "Visakhapatnam", state: "Andhra Pradesh" },
  { city: "Vijayawada", state: "Andhra Pradesh" },
  { city: "Guntur", state: "Andhra Pradesh" },
  { city: "Nellore", state: "Andhra Pradesh" },
  { city: "Kurnool", state: "Andhra Pradesh" },
  { city: "Rajahmundry", state: "Andhra Pradesh" },
  { city: "Kakinada", state: "Andhra Pradesh" },
  { city: "Tirupati", state: "Andhra Pradesh" },
  { city: "Anantapur", state: "Andhra Pradesh" },
  { city: "Kadapa", state: "Andhra Pradesh" },
  { city: "Eluru", state: "Andhra Pradesh" },
  { city: "Ongole", state: "Andhra Pradesh" },
  { city: "Chittoor", state: "Andhra Pradesh" },
  { city: "Machilipatnam", state: "Andhra Pradesh" },
  { city: "Srikakulam", state: "Andhra Pradesh" },
  { city: "Vizianagaram", state: "Andhra Pradesh" },
  { city: "Itanagar", state: "Arunachal Pradesh" },
  { city: "Naharlagun", state: "Arunachal Pradesh" },
  { city: "Tawang", state: "Arunachal Pradesh" },
  { city: "Pasighat", state: "Arunachal Pradesh" },
  { city: "Ziro", state: "Arunachal Pradesh" },
  { city: "Bomdila", state: "Arunachal Pradesh" },
  { city: "Tezu", state: "Arunachal Pradesh" },
  { city: "Roing", state: "Arunachal Pradesh" },
  { city: "Guwahati", state: "Assam" },
  { city: "Dibrugarh", state: "Assam" },
  { city: "Silchar", state: "Assam" },
  { city: "Jorhat", state: "Assam" },
  { city: "Tezpur", state: "Assam" },
  { city: "Nagaon", state: "Assam" },
  { city: "Tinsukia", state: "Assam" },
  { city: "Bongaigaon", state: "Assam" },
  { city: "Dhubri", state: "Assam" },
  { city: "Sivasagar", state: "Assam" },
  { city: "Diphu", state: "Assam" },
  { city: "Patna", state: "Bihar" },
  { city: "Gaya", state: "Bihar" },
  { city: "Bhagalpur", state: "Bihar" },
  { city: "Muzaffarpur", state: "Bihar" },
  { city: "Darbhanga", state: "Bihar" },
  { city: "Purnia", state: "Bihar" },
  { city: "Arrah", state: "Bihar" },
  { city: "Begusarai", state: "Bihar" },
  { city: "Katihar", state: "Bihar" },
  { city: "Munger", state: "Bihar" },
  { city: "Bihar Sharif", state: "Bihar" },
  { city: "Chhapra", state: "Bihar" },
  { city: "Siwan", state: "Bihar" },
  { city: "Motihari", state: "Bihar" },
  { city: "Bettiah", state: "Bihar" },
  { city: "Sasaram", state: "Bihar" },
  { city: "Raipur", state: "Chhattisgarh" },
  { city: "Bhilai", state: "Chhattisgarh" },
  { city: "Durg", state: "Chhattisgarh" },
  { city: "Bilaspur", state: "Chhattisgarh" },
  { city: "Korba", state: "Chhattisgarh" },
  { city: "Raigarh", state: "Chhattisgarh" },
  { city: "Jagdalpur", state: "Chhattisgarh" },
  { city: "Ambikapur", state: "Chhattisgarh" },
  { city: "Rajnandgaon", state: "Chhattisgarh" },
  { city: "Chirmiri", state: "Chhattisgarh" },
  { city: "Delhi", state: "Delhi", aliases: ["New Delhi"] },
  { city: "Panaji", state: "Goa" },
  { city: "Margao", state: "Goa" },
  { city: "Vasco da Gama", state: "Goa" },
  { city: "Mapusa", state: "Goa" },
  { city: "Ponda", state: "Goa" },
  { city: "Bicholim", state: "Goa" },
  { city: "Ahmedabad", state: "Gujarat" },
  { city: "Surat", state: "Gujarat" },
  { city: "Vadodara", state: "Gujarat", aliases: ["Baroda"] },
  { city: "Rajkot", state: "Gujarat" },
  { city: "Gandhinagar", state: "Gujarat" },
  { city: "Bhavnagar", state: "Gujarat" },
  { city: "Jamnagar", state: "Gujarat" },
  { city: "Junagadh", state: "Gujarat" },
  { city: "Anand", state: "Gujarat" },
  { city: "Nadiad", state: "Gujarat" },
  { city: "Bharuch", state: "Gujarat" },
  { city: "Vapi", state: "Gujarat" },
  { city: "Navsari", state: "Gujarat" },
  { city: "Porbandar", state: "Gujarat" },
  { city: "Mehsana", state: "Gujarat" },
  { city: "Morbi", state: "Gujarat" },
  { city: "Bhuj", state: "Gujarat" },
  { city: "Gandhidham", state: "Gujarat" },
  { city: "Surendranagar", state: "Gujarat" },
  { city: "Gurugram", state: "Haryana", aliases: ["Gurgaon"] },
  { city: "Faridabad", state: "Haryana" },
  { city: "Panipat", state: "Haryana" },
  { city: "Ambala", state: "Haryana" },
  { city: "Hisar", state: "Haryana" },
  { city: "Karnal", state: "Haryana" },
  { city: "Sonipat", state: "Haryana" },
  { city: "Rohtak", state: "Haryana" },
  { city: "Yamunanagar", state: "Haryana" },
  { city: "Panchkula", state: "Haryana" },
  { city: "Kurukshetra", state: "Haryana" },
  { city: "Rewari", state: "Haryana" },
  { city: "Sirsa", state: "Haryana" },
  { city: "Bahadurgarh", state: "Haryana" },
  { city: "Jind", state: "Haryana" },
  { city: "Shimla", state: "Himachal Pradesh" },
  { city: "Dharamshala", state: "Himachal Pradesh" },
  { city: "Mandi", state: "Himachal Pradesh" },
  { city: "Solan", state: "Himachal Pradesh" },
  { city: "Kullu", state: "Himachal Pradesh" },
  { city: "Manali", state: "Himachal Pradesh" },
  { city: "Hamirpur", state: "Himachal Pradesh" },
  { city: "Una", state: "Himachal Pradesh" },
  { city: "Chamba", state: "Himachal Pradesh" },
  { city: "Srinagar", state: "Jammu and Kashmir" },
  { city: "Jammu", state: "Jammu and Kashmir" },
  { city: "Anantnag", state: "Jammu and Kashmir" },
  { city: "Baramulla", state: "Jammu and Kashmir" },
  { city: "Udhampur", state: "Jammu and Kashmir" },
  { city: "Kathua", state: "Jammu and Kashmir" },
  { city: "Ranchi", state: "Jharkhand" },
  { city: "Jamshedpur", state: "Jharkhand" },
  { city: "Dhanbad", state: "Jharkhand" },
  { city: "Bokaro Steel City", state: "Jharkhand" },
  { city: "Deoghar", state: "Jharkhand" },
  { city: "Hazaribagh", state: "Jharkhand" },
  { city: "Giridih", state: "Jharkhand" },
  { city: "Ramgarh", state: "Jharkhand" },
  { city: "Medininagar", state: "Jharkhand" },
  { city: "Dumka", state: "Jharkhand" },
  { city: "Chaibasa", state: "Jharkhand" },
  { city: "Bengaluru", state: "Karnataka", aliases: ["Bangalore"] },
  { city: "Mysuru", state: "Karnataka", aliases: ["Mysore"] },
  { city: "Mangaluru", state: "Karnataka", aliases: ["Mangalore"] },
  { city: "Hubballi", state: "Karnataka", aliases: ["Hubli"] },
  { city: "Dharwad", state: "Karnataka" },
  { city: "Belagavi", state: "Karnataka", aliases: ["Belgaum"] },
  { city: "Davanagere", state: "Karnataka" },
  { city: "Ballari", state: "Karnataka", aliases: ["Bellary"] },
  { city: "Shivamogga", state: "Karnataka", aliases: ["Shimoga"] },
  { city: "Tumakuru", state: "Karnataka", aliases: ["Tumkur"] },
  { city: "Udupi", state: "Karnataka" },
  { city: "Kalaburagi", state: "Karnataka", aliases: ["Gulbarga"] },
  { city: "Vijayapura", state: "Karnataka", aliases: ["Bijapur"] },
  { city: "Hassan", state: "Karnataka" },
  { city: "Bidar", state: "Karnataka" },
  { city: "Raichur", state: "Karnataka" },
  { city: "Chitradurga", state: "Karnataka" },
  { city: "Kolar", state: "Karnataka" },
  { city: "Mandya", state: "Karnataka" },
  { city: "Bagalkot", state: "Karnataka" },
  { city: "Hospet", state: "Karnataka" },
  { city: "Kochi", state: "Kerala" },
  { city: "Thiruvananthapuram", state: "Kerala", aliases: ["Trivandrum"] },
  { city: "Kozhikode", state: "Kerala", aliases: ["Calicut"] },
  { city: "Thrissur", state: "Kerala" },
  { city: "Kollam", state: "Kerala" },
  { city: "Kannur", state: "Kerala" },
  { city: "Alappuzha", state: "Kerala" },
  { city: "Kottayam", state: "Kerala" },
  { city: "Palakkad", state: "Kerala" },
  { city: "Malappuram", state: "Kerala" },
  { city: "Pathanamthitta", state: "Kerala" },
  { city: "Kasaragod", state: "Kerala" },
  { city: "Wayanad", state: "Kerala" },
  { city: "Idukki", state: "Kerala" },
  { city: "Ernakulam", state: "Kerala" },
  { city: "Leh", state: "Ladakh" },
  { city: "Kargil", state: "Ladakh" },
  { city: "Bhopal", state: "Madhya Pradesh" },
  { city: "Indore", state: "Madhya Pradesh" },
  { city: "Gwalior", state: "Madhya Pradesh" },
  { city: "Jabalpur", state: "Madhya Pradesh" },
  { city: "Ujjain", state: "Madhya Pradesh" },
  { city: "Sagar", state: "Madhya Pradesh" },
  { city: "Rewa", state: "Madhya Pradesh" },
  { city: "Satna", state: "Madhya Pradesh" },
  { city: "Dewas", state: "Madhya Pradesh" },
  { city: "Ratlam", state: "Madhya Pradesh" },
  { city: "Khandwa", state: "Madhya Pradesh" },
  { city: "Burhanpur", state: "Madhya Pradesh" },
  { city: "Chhindwara", state: "Madhya Pradesh" },
  { city: "Morena", state: "Madhya Pradesh" },
  { city: "Shivpuri", state: "Madhya Pradesh" },
  { city: "Vidisha", state: "Madhya Pradesh" },
  { city: "Mandsaur", state: "Madhya Pradesh" },
  { city: "Neemuch", state: "Madhya Pradesh" },
  { city: "Betul", state: "Madhya Pradesh" },
  { city: "Hoshangabad", state: "Madhya Pradesh" },
  { city: "Sehore", state: "Madhya Pradesh" },
  { city: "Mumbai", state: "Maharashtra", aliases: ["Bombay"] },
  { city: "Pune", state: "Maharashtra" },
  { city: "Nagpur", state: "Maharashtra" },
  { city: "Nashik", state: "Maharashtra" },
  { city: "Thane", state: "Maharashtra" },
  { city: "Navi Mumbai", state: "Maharashtra" },
  {
    city: "Chhatrapati Sambhajinagar",
    state: "Maharashtra",
    aliases: ["Aurangabad"],
  },
  { city: "Solapur", state: "Maharashtra" },
  { city: "Kolhapur", state: "Maharashtra" },
  { city: "Amravati", state: "Maharashtra" },
  { city: "Nanded", state: "Maharashtra" },
  { city: "Sangli", state: "Maharashtra" },
  { city: "Jalgaon", state: "Maharashtra" },
  { city: "Akola", state: "Maharashtra" },
  { city: "Latur", state: "Maharashtra" },
  { city: "Dhule", state: "Maharashtra" },
  { city: "Ahmednagar", state: "Maharashtra" },
  { city: "Chandrapur", state: "Maharashtra" },
  { city: "Parbhani", state: "Maharashtra" },
  { city: "Beed", state: "Maharashtra" },
  { city: "Wardha", state: "Maharashtra" },
  { city: "Gondia", state: "Maharashtra" },
  { city: "Satara", state: "Maharashtra" },
  { city: "Ratnagiri", state: "Maharashtra" },
  { city: "Imphal", state: "Manipur" },
  { city: "Thoubal", state: "Manipur" },
  { city: "Bishnupur", state: "Manipur" },
  { city: "Churachandpur", state: "Manipur" },
  { city: "Ukhrul", state: "Manipur" },
  { city: "Kakching", state: "Manipur" },
  { city: "Shillong", state: "Meghalaya" },
  { city: "Tura", state: "Meghalaya" },
  { city: "Jowai", state: "Meghalaya" },
  { city: "Nongpoh", state: "Meghalaya" },
  { city: "Williamnagar", state: "Meghalaya" },
  { city: "Baghmara", state: "Meghalaya" },
  { city: "Aizawl", state: "Mizoram" },
  { city: "Lunglei", state: "Mizoram" },
  { city: "Champhai", state: "Mizoram" },
  { city: "Serchhip", state: "Mizoram" },
  { city: "Kolasib", state: "Mizoram" },
  { city: "Mamit", state: "Mizoram" },
  { city: "Kohima", state: "Nagaland" },
  { city: "Dimapur", state: "Nagaland" },
  { city: "Mokokchung", state: "Nagaland" },
  { city: "Tuensang", state: "Nagaland" },
  { city: "Wokha", state: "Nagaland" },
  { city: "Zunheboto", state: "Nagaland" },
  { city: "Bhubaneswar", state: "Odisha" },
  { city: "Cuttack", state: "Odisha" },
  { city: "Rourkela", state: "Odisha" },
  { city: "Puri", state: "Odisha" },
  { city: "Sambalpur", state: "Odisha" },
  { city: "Berhampur", state: "Odisha" },
  { city: "Balasore", state: "Odisha" },
  { city: "Baripada", state: "Odisha" },
  { city: "Bhadrak", state: "Odisha" },
  { city: "Jharsuguda", state: "Odisha" },
  { city: "Jeypore", state: "Odisha" },
  { city: "Angul", state: "Odisha" },
  { city: "Dhenkanal", state: "Odisha" },
  { city: "Kendrapara", state: "Odisha" },
  { city: "Ludhiana", state: "Punjab" },
  { city: "Amritsar", state: "Punjab" },
  { city: "Jalandhar", state: "Punjab" },
  { city: "Patiala", state: "Punjab" },
  { city: "Bathinda", state: "Punjab" },
  { city: "Mohali", state: "Punjab" },
  { city: "Pathankot", state: "Punjab" },
  { city: "Hoshiarpur", state: "Punjab" },
  { city: "Moga", state: "Punjab" },
  { city: "Firozpur", state: "Punjab" },
  { city: "Kapurthala", state: "Punjab" },
  { city: "Sangrur", state: "Punjab" },
  { city: "Barnala", state: "Punjab" },
  { city: "Jaipur", state: "Rajasthan" },
  { city: "Jodhpur", state: "Rajasthan" },
  { city: "Udaipur", state: "Rajasthan" },
  { city: "Kota", state: "Rajasthan" },
  { city: "Ajmer", state: "Rajasthan" },
  { city: "Bikaner", state: "Rajasthan" },
  { city: "Alwar", state: "Rajasthan" },
  { city: "Bhilwara", state: "Rajasthan" },
  { city: "Sikar", state: "Rajasthan" },
  { city: "Bharatpur", state: "Rajasthan" },
  { city: "Pali", state: "Rajasthan" },
  { city: "Sri Ganganagar", state: "Rajasthan" },
  { city: "Hanumangarh", state: "Rajasthan" },
  { city: "Churu", state: "Rajasthan" },
  { city: "Jhunjhunu", state: "Rajasthan" },
  { city: "Barmer", state: "Rajasthan" },
  { city: "Jaisalmer", state: "Rajasthan" },
  { city: "Sawai Madhopur", state: "Rajasthan" },
  { city: "Dausa", state: "Rajasthan" },
  { city: "Gangtok", state: "Sikkim" },
  { city: "Namchi", state: "Sikkim" },
  { city: "Geyzing", state: "Sikkim" },
  { city: "Mangan", state: "Sikkim" },
  { city: "Rangpo", state: "Sikkim" },
  { city: "Singtam", state: "Sikkim" },
  { city: "Chennai", state: "Tamil Nadu" },
  { city: "Coimbatore", state: "Tamil Nadu" },
  { city: "Madurai", state: "Tamil Nadu" },
  { city: "Tiruchirappalli", state: "Tamil Nadu", aliases: ["Trichy"] },
  { city: "Salem", state: "Tamil Nadu" },
  { city: "Tirunelveli", state: "Tamil Nadu" },
  { city: "Erode", state: "Tamil Nadu" },
  { city: "Vellore", state: "Tamil Nadu" },
  { city: "Thanjavur", state: "Tamil Nadu" },
  { city: "Thoothukudi", state: "Tamil Nadu" },
  { city: "Dindigul", state: "Tamil Nadu" },
  { city: "Tiruppur", state: "Tamil Nadu" },
  { city: "Cuddalore", state: "Tamil Nadu" },
  { city: "Kanchipuram", state: "Tamil Nadu" },
  { city: "Nagercoil", state: "Tamil Nadu" },
  { city: "Hosur", state: "Tamil Nadu" },
  { city: "Karur", state: "Tamil Nadu" },
  { city: "Sivakasi", state: "Tamil Nadu" },
  { city: "Kumbakonam", state: "Tamil Nadu" },
  { city: "Hyderabad", state: "Telangana" },
  { city: "Warangal", state: "Telangana" },
  { city: "Nizamabad", state: "Telangana" },
  { city: "Karimnagar", state: "Telangana" },
  { city: "Khammam", state: "Telangana" },
  { city: "Ramagundam", state: "Telangana" },
  { city: "Mahbubnagar", state: "Telangana" },
  { city: "Nalgonda", state: "Telangana" },
  { city: "Adilabad", state: "Telangana" },
  { city: "Siddipet", state: "Telangana" },
  { city: "Suryapet", state: "Telangana" },
  { city: "Mancherial", state: "Telangana" },
  { city: "Agartala", state: "Tripura" },
  { city: "Dharmanagar", state: "Tripura" },
  { city: "Kailashahar", state: "Tripura" },
  { city: "Belonia", state: "Tripura" },
  { city: "Khowai", state: "Tripura" },
  { city: "Ambassa", state: "Tripura" },
  { city: "Lucknow", state: "Uttar Pradesh" },
  { city: "Kanpur", state: "Uttar Pradesh" },
  { city: "Varanasi", state: "Uttar Pradesh" },
  { city: "Prayagraj", state: "Uttar Pradesh", aliases: ["Allahabad"] },
  { city: "Agra", state: "Uttar Pradesh" },
  { city: "Meerut", state: "Uttar Pradesh" },
  { city: "Ghaziabad", state: "Uttar Pradesh" },
  { city: "Noida", state: "Uttar Pradesh" },
  { city: "Greater Noida", state: "Uttar Pradesh" },
  { city: "Bareilly", state: "Uttar Pradesh" },
  { city: "Aligarh", state: "Uttar Pradesh" },
  { city: "Moradabad", state: "Uttar Pradesh" },
  { city: "Saharanpur", state: "Uttar Pradesh" },
  { city: "Gorakhpur", state: "Uttar Pradesh" },
  { city: "Ayodhya", state: "Uttar Pradesh" },
  { city: "Mathura", state: "Uttar Pradesh" },
  { city: "Firozabad", state: "Uttar Pradesh" },
  { city: "Jhansi", state: "Uttar Pradesh" },
  { city: "Muzaffarnagar", state: "Uttar Pradesh" },
  { city: "Rampur", state: "Uttar Pradesh" },
  { city: "Shahjahanpur", state: "Uttar Pradesh" },
  { city: "Hapur", state: "Uttar Pradesh" },
  { city: "Etawah", state: "Uttar Pradesh" },
  { city: "Mirzapur", state: "Uttar Pradesh" },
  { city: "Bulandshahr", state: "Uttar Pradesh" },
  { city: "Rae Bareli", state: "Uttar Pradesh" },
  { city: "Amroha", state: "Uttar Pradesh" },
  { city: "Bijnor", state: "Uttar Pradesh" },
  { city: "Dehradun", state: "Uttarakhand" },
  { city: "Haridwar", state: "Uttarakhand" },
  { city: "Roorkee", state: "Uttarakhand" },
  { city: "Haldwani", state: "Uttarakhand" },
  { city: "Nainital", state: "Uttarakhand" },
  { city: "Rishikesh", state: "Uttarakhand" },
  { city: "Rudrapur", state: "Uttarakhand" },
  { city: "Kashipur", state: "Uttarakhand" },
  { city: "Almora", state: "Uttarakhand" },
  { city: "Pithoragarh", state: "Uttarakhand" },
  { city: "Mussoorie", state: "Uttarakhand" },
  { city: "Kolkata", state: "West Bengal", aliases: ["Calcutta"] },
  { city: "Howrah", state: "West Bengal" },
  { city: "Durgapur", state: "West Bengal" },
  { city: "Asansol", state: "West Bengal" },
  { city: "Siliguri", state: "West Bengal" },
  { city: "Darjeeling", state: "West Bengal" },
  { city: "Kharagpur", state: "West Bengal" },
  { city: "Bardhaman", state: "West Bengal" },
  { city: "Malda", state: "West Bengal" },
  { city: "Berhampore", state: "West Bengal" },
  { city: "Jalpaiguri", state: "West Bengal" },
  { city: "Haldia", state: "West Bengal" },
  { city: "Krishnanagar", state: "West Bengal" },
  { city: "Bankura", state: "West Bengal" },
  { city: "Purulia", state: "West Bengal" },
  { city: "Cooch Behar", state: "West Bengal" },
  { city: "Chandigarh", state: "Chandigarh" },
  { city: "Puducherry", state: "Puducherry" },
  { city: "Karaikal", state: "Puducherry" },
  { city: "Yanam", state: "Puducherry" },
  { city: "Mahe", state: "Puducherry" },
  { city: "Port Blair", state: "Andaman and Nicobar Islands" },
  { city: "Diglipur", state: "Andaman and Nicobar Islands" },
  { city: "Mayabunder", state: "Andaman and Nicobar Islands" },
  { city: "Kavaratti", state: "Lakshadweep" },
  { city: "Daman", state: "Dadra and Nagar Haveli and Daman and Diu" },
  { city: "Diu", state: "Dadra and Nagar Haveli and Daman and Diu" },
  { city: "Silvassa", state: "Dadra and Nagar Haveli and Daman and Diu" },
];

export const cityOptions = indiaCityList.map((option) => ({
  ...option,
  label: option.label || `${option.city}, ${option.state}`,
  shortLabel: option.shortLabel || `${option.city}, ${option.state}`,
}));

export const listingCityOptions = cityOptions;

export const roomTypeOptions = ["Single Room", "PG", "Shared Room", "Flat", "Hostel"];

export const roomTypeMeta = {
  "Single Room": {
    label: "Single Room",
    iconKey: "home",
    color: "#2563eb",
    softColor: "#dbeafe",
    textColor: "#1e3a8a",
  },
  PG: {
    label: "PG",
    iconKey: "building",
    color: "#16a34a",
    softColor: "#dcfce7",
    textColor: "#14532d",
  },
  "Shared Room": {
    label: "Shared Room",
    iconKey: "users",
    color: "#7c3aed",
    softColor: "#ede9fe",
    textColor: "#4c1d95",
  },
  Flat: {
    label: "Flat",
    iconKey: "flat",
    color: "#f97316",
    softColor: "#ffedd5",
    textColor: "#7c2d12",
  },
  Hostel: {
    label: "Hostel",
    iconKey: "bed",
    color: "#0891b2",
    softColor: "#cffafe",
    textColor: "#164e63",
  },
};

export function getCityOption(city, state = "") {
  return getKnownCityOption(city) || getCustomCityOption(city, state);
}

export function getCityOptionFromLocation(payload = {}) {
  const address = payload?.address || {};
  const state = payload?.state || address.state || "";
  const cityCandidates = uniqueValues([
    payload?.city,
    address.city,
    address.town,
    address.village,
    address.municipality,
    address.city_district,
    address.suburb,
    address.neighbourhood,
    address.locality,
    address.hamlet,
    address.county,
    address.district,
    address.state_district,
  ]);

  for (const cityCandidate of cityCandidates) {
    const knownOption = getKnownCityOption(cityCandidate);
    if (knownOption?.city) return knownOption;
  }

  return getCustomCityOption(cityCandidates[0], state);
}

export function getCityStateLabel(city, state = "") {
  if (!city) return allCitiesOption.label;
  const option = getCityOption(city, state);
  return option.city ? option.label : [city, state].filter(Boolean).join(", ");
}

export function getRoomTypeMeta(type = "") {
  const normalizedType = String(type || "").trim();
  if (roomTypeMeta[normalizedType]) return roomTypeMeta[normalizedType];

  const lowerType = normalizedType.toLowerCase();
  if (lowerType.includes("single")) return roomTypeMeta["Single Room"];
  if (lowerType.includes("shared") || lowerType.includes("twin"))
    return roomTypeMeta["Shared Room"];
  if (lowerType.includes("flat") || lowerType.includes("bhk") || lowerType.includes("studio")) {
    return roomTypeMeta.Flat;
  }
  if (lowerType.includes("hostel")) return roomTypeMeta.Hostel;
  if (lowerType.includes("pg")) return roomTypeMeta.PG;

  return roomTypeMeta["Single Room"];
}

export function getCityFromStorage() {
  try {
    const storedCity = localStorage.getItem(CITY_STORAGE_KEY) || "";
    return getCityOption(storedCity).city;
  } catch {
    return "";
  }
}

export function saveCityToStorage(city) {
  try {
    if (city) {
      localStorage.setItem(CITY_STORAGE_KEY, city);
    } else {
      localStorage.removeItem(CITY_STORAGE_KEY);
    }
  } catch {
    // Local storage is optional for this control.
  }
}

function getKnownCityOption(city) {
  const normalizedCity = normalizeText(city);
  if (!normalizedCity) return null;

  const exactOption = cityOptions.find((option) =>
    getCitySearchNames(option).some((name) => normalizeText(name) === normalizedCity),
  );

  if (exactOption) return exactOption;

  return (
    cityOptions.find((option) =>
      getCitySearchNames(option).some((name) =>
        isCityNameInText(normalizedCity, normalizeText(name)),
      ),
    ) || null
  );
}

function getCustomCityOption(city, state = "") {
  const cityLabel = cleanCityLabel(city);
  if (!cityLabel) return allCitiesOption;

  const stateLabel = cleanCityLabel(state);
  const label = stateLabel ? `${cityLabel}, ${stateLabel}` : cityLabel;

  return {
    city: cityLabel,
    state: stateLabel || "Custom city",
    label,
    shortLabel: label,
    custom: true,
  };
}

function getCitySearchNames(option) {
  return [option.city, ...(option.aliases || [])].filter(Boolean);
}

function isCityNameInText(text, cityName) {
  if (!text || !cityName || cityName.length < 4) return false;

  return new RegExp(`(^| )${escapeRegExp(cityName)}($| )`).test(text);
}

function cleanCityLabel(value) {
  return String(value || "")
    .split(",")[0]
    .replace(
      /\b(city|district|division|municipality|municipal corporation|suburban|urban|rural|tehsil|taluka|mandal|subdivision|ncr)\b/gi,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(
      /\b(city|district|division|municipality|municipal corporation|suburban|urban|rural|tehsil|taluka|mandal|subdivision|ncr)\b/g,
      "",
    )
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function uniqueValues(values) {
  const seen = new Set();

  return values
    .map((value) => cleanCityLabel(value))
    .filter((value) => {
      const normalizedValue = normalizeText(value);
      if (!normalizedValue || seen.has(normalizedValue)) return false;
      seen.add(normalizedValue);
      return true;
    });
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
