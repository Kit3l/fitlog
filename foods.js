'use strict';
/*
  Kenyan food database. Values are per 100 g (or 100 ml for drinks) of the food AS EATEN
  (cooked / prepared), and are approximate (+/- 10-15%). Home cooking varies, especially oil.
  Fields: id, n = name, alt = search words, k = kcal, p = protein g, c = carbs g, f = fat g,
          u = household units [label, grams]
*/
window.FOODS = [
  // Staples
  { id:'ugali', n:'Ugali', alt:'sima posho maize meal', k:120, p:2.7, c:25.5, f:0.7, u:[['1 fist-sized portion',150],['1 plate (large)',250]] },
  { id:'rice-white', n:'Rice, white (cooked)', alt:'mchele wali', k:130, p:2.7, c:28, f:0.3, u:[['1 cup cooked',160],['1 fist',120]] },
  { id:'rice-brown', n:'Rice, brown (cooked)', alt:'mchele', k:112, p:2.3, c:23, f:0.8, u:[['1 cup cooked',160]] },
  { id:'pilau', n:'Pilau (with meat)', alt:'pilau rice spiced', k:175, p:6, c:24, f:6, u:[['1 plate',300],['1 cup',170]] },
  { id:'chapati', n:'Chapati', alt:'chapo', k:300, p:7, c:45, f:10, u:[['1 chapati (medium)',80],['1 chapati (large)',110]] },
  { id:'mandazi', n:'Mandazi', alt:'maandazi doughnut', k:350, p:6, c:45, f:16, u:[['1 mandazi',50]] },
  { id:'bread', n:'Bread, white (sliced)', alt:'mkate', k:262, p:9, c:49, f:3.2, u:[['1 slice',30],['1 thick slice',40]] },
  { id:'sweet-potato', n:'Sweet potato (boiled)', alt:'viazi vitamu', k:90, p:1.6, c:20.7, f:0.1, u:[['1 medium',130],['1 large',200]] },
  { id:'potato', n:'Irish potato (boiled)', alt:'waru viazi', k:88, p:1.9, c:20, f:0.1, u:[['1 medium',150]] },
  { id:'arrowroot', n:'Arrowroot (nduma, boiled)', alt:'nduma taro', k:130, p:0.5, c:32, f:0.1, u:[['1 piece',100]] },
  { id:'cassava', n:'Cassava (boiled)', alt:'muhogo mihogo', k:160, p:1.4, c:38, f:0.3, u:[['1 piece',100]] },
  { id:'matoke', n:'Matoke (boiled green banana)', alt:'plantain ndizi', k:108, p:0.9, c:26, f:0.2, u:[['1 cup',150]] },
  { id:'githeri', n:'Githeri (maize and beans)', alt:'muthokoi', k:117, p:5, c:21, f:1.5, u:[['1 cup',175],['1 plate',300]] },
  { id:'mukimo', n:'Mukimo', alt:'irio mashed', k:130, p:3.5, c:22, f:3, u:[['1 cup',200],['1 plate',300]] },
  { id:'chips', n:'Chips (fried potato)', alt:'fries', k:305, p:3.5, c:40, f:15, u:[['1 small portion',120],['1 regular portion',200]] },
  { id:'spaghetti', n:'Spaghetti (cooked)', alt:'pasta', k:158, p:5.8, c:31, f:0.9, u:[['1 cup',140]] },
  { id:'oats', n:'Oats (dry)', alt:'porridge oatmeal', k:380, p:13, c:67, f:7, u:[['1/2 cup dry',40],['1 tablespoon',10]] },
  { id:'uji', n:'Uji (porridge, no sugar)', alt:'porridge millet sorghum', k:49, p:1, c:10, f:0.5, u:[['1 mug',250]] },
  { id:'maize-cob', n:'Maize on the cob (boiled or roasted)', alt:'mahindi choma corn', k:96, p:3.4, c:21, f:1.5, u:[['1 cob (edible part)',100]] },

  // Legumes
  { id:'ndengu', n:'Ndengu, boiled (no oil)', alt:'green gram mung dengu', k:105, p:7, c:19, f:0.4, u:[['1 cup',180],['1 ladle',100]] },
  { id:'ndengu-stew', n:'Ndengu stew (with oil)', alt:'green gram dengu', k:130, p:7, c:18, f:3, u:[['1 cup',180],['1 ladle',100]] },
  { id:'beans', n:'Beans, boiled (no oil)', alt:'maharagwe kidney', k:130, p:8.7, c:22.8, f:0.5, u:[['1 cup',180]] },
  { id:'beans-stew', n:'Beans stew (with oil)', alt:'maharagwe', k:152, p:8, c:20, f:4.5, u:[['1 cup',180],['1 ladle',100]] },
  { id:'lentils', n:'Lentils (kamande, cooked)', alt:'dengu dal', k:116, p:9, c:20, f:0.4, u:[['1 cup',190]] },

  // Meat, fish, eggs
  { id:'egg', n:'Egg (boiled)', alt:'mayai', k:155, p:13, c:1.1, f:11, u:[['1 egg',50],['2 eggs',100]] },
  { id:'chicken-breast', n:'Chicken breast (cooked, skinless)', alt:'kuku', k:165, p:31, c:0, f:3.6, u:[['1 breast piece',150],['1 palm-sized piece',100]] },
  { id:'chicken-skin', n:'Chicken with skin (roasted or stewed)', alt:'kuku leg thigh', k:240, p:25, c:0, f:15, u:[['1 leg quarter (edible)',130],['1 drumstick (edible)',70]] },
  { id:'beef-lean', n:'Beef, lean (stewed)', alt:'nyama ng\'ombe', k:185, p:30, c:0, f:7, u:[['1 palm-sized portion',100],['1 large portion',150]] },
  { id:'beef-fatty', n:'Beef, fatty cut or fried', alt:'nyama choma ribs', k:270, p:25, c:0, f:19, u:[['1 portion',150]] },
  { id:'goat', n:'Goat meat (roasted)', alt:'nyama choma mbuzi', k:163, p:27, c:0, f:6, u:[['1 portion',150],['1/4 kg',250]] },
  { id:'liver', n:'Liver (beef, cooked)', alt:'maini', k:170, p:27, c:4, f:5, u:[['1 portion',100]] },
  { id:'smokie', n:'Smokie (sausage)', alt:'sausage', k:300, p:11, c:3, f:27, u:[['1 smokie',50]] },
  { id:'tilapia', n:'Tilapia (grilled or steamed)', alt:'fish samaki', k:128, p:26, c:0, f:2.7, u:[['1 fillet',150],['1 whole fish (edible)',180]] },
  { id:'tilapia-fried', n:'Tilapia (fried)', alt:'fish samaki', k:210, p:22, c:4, f:12, u:[['1 fillet',150],['1 whole fish (edible)',180]] },
  { id:'nile-perch', n:'Nile perch (grilled)', alt:'mbuta fish samaki', k:123, p:24, c:0, f:3, u:[['1 fillet',150]] },
  { id:'omena-dry', n:'Omena (dried, raw)', alt:'dagaa sardine whitebait', k:315, p:60, c:0, f:8, u:[['1 handful',30],['1 cup',60]] },
  { id:'omena-stew', n:'Omena stew (cooked)', alt:'dagaa', k:145, p:20, c:3, f:6, u:[['1 cup',150],['1 ladle',80]] },
  { id:'whey', n:'Whey protein powder', alt:'protein shake supplement', k:400, p:80, c:8, f:6, u:[['1 scoop',30]] },

  // Dairy and fats
  { id:'milk', n:'Milk, whole (fresh)', alt:'maziwa', k:61, p:3.2, c:4.8, f:3.3, u:[['1 cup (240 ml)',240],['splash in tea (50 ml)',50],['100 ml',100]] },
  { id:'mala', n:'Mala (fermented milk)', alt:'maziwa lala yoghurt', k:60, p:3.2, c:4.6, f:3.2, u:[['1 glass (250 ml)',250],['1 cup (200 ml)',200]] },
  { id:'yoghurt', n:'Yoghurt, plain', alt:'mtindi', k:63, p:3.5, c:4.7, f:3.3, u:[['1 small pot (150 g)',150]] },
  { id:'oil', n:'Cooking oil', alt:'mafuta', k:900, p:0, c:0, f:100, u:[['1 teaspoon',4.5],['1 tablespoon',14]] },
  { id:'blueband', n:'Margarine or butter (Blueband)', alt:'butter siagi', k:723, p:0.2, c:0.7, f:80, u:[['1 teaspoon',5],['1 thin spread on 1 slice',7]] },
  { id:'peanut-butter', n:'Peanut butter', alt:'groundnut', k:590, p:25, c:20, f:50, u:[['1 tablespoon',16]] },
  { id:'groundnuts', n:'Groundnuts (roasted)', alt:'karanga peanuts', k:585, p:26, c:16, f:50, u:[['1 handful',30]] },
  { id:'avocado', n:'Avocado', alt:'parachichi', k:160, p:2, c:8.5, f:14.7, u:[['1/2 medium',100],['1/4 medium',50]] },

  // Vegetables
  { id:'sukuma', n:'Sukuma wiki (cooked, little oil)', alt:'kale collard greens', k:55, p:3, c:6, f:2.5, u:[['1 serving',150],['1/2 plate',100]] },
  { id:'cabbage', n:'Cabbage (stewed, little oil)', alt:'kabichi', k:50, p:1.5, c:6, f:2.5, u:[['1 serving',150]] },
  { id:'leafy-greens', n:'Managu, terere or kunde (cooked)', alt:'african nightshade amaranth cowpea leaves traditional vegetables', k:45, p:4, c:4, f:1.5, u:[['1 serving',150]] },
  { id:'spinach', n:'Spinach (cooked)', alt:'mchicha', k:23, p:3, c:3.7, f:0.3, u:[['1 serving',150]] },
  { id:'kachumbari', n:'Kachumbari', alt:'salad tomato onion', k:25, p:1, c:5, f:0.2, u:[['1 serving',100]] },
  { id:'carrot', n:'Carrot (cooked)', alt:'karoti', k:35, p:0.8, c:8, f:0.2, u:[['1 serving',80]] },
  { id:'french-beans', n:'French beans (cooked)', alt:'green beans', k:35, p:1.9, c:7, f:0.3, u:[['1 serving',100]] },
  { id:'stew-gravy', n:'Stew gravy (tomato and onion, with oil)', alt:'soup sauce mchuzi', k:70, p:1.2, c:7, f:4, u:[['1 ladle',60],['1 small cup',100]] },

  // Fruit
  { id:'banana', n:'Banana', alt:'ndizi', k:89, p:1.1, c:22.8, f:0.3, u:[['1 medium',100],['1 small',70]] },
  { id:'mango', n:'Mango', alt:'embe', k:60, p:0.8, c:15, f:0.4, u:[['1 cup chunks',165],['1 whole (flesh)',200]] },
  { id:'pawpaw', n:'Pawpaw (papaya)', alt:'papai', k:43, p:0.5, c:11, f:0.3, u:[['1 slice',150],['1 cup',140]] },
  { id:'orange', n:'Orange', alt:'chungwa', k:47, p:0.9, c:12, f:0.1, u:[['1 medium',130]] },
  { id:'watermelon', n:'Watermelon', alt:'tikiti maji', k:30, p:0.6, c:7.6, f:0.2, u:[['1 slice',250]] },
  { id:'pineapple', n:'Pineapple', alt:'nanasi', k:50, p:0.5, c:13, f:0.1, u:[['1 slice',100],['1 cup',165]] },
  { id:'passion', n:'Passion fruit', alt:'pasheni', k:97, p:2.2, c:23, f:0.7, u:[['1 fruit (pulp)',18]] },
  { id:'apple', n:'Apple', alt:'tufaha', k:52, p:0.3, c:14, f:0.2, u:[['1 medium',180]] },

  // Drinks
  { id:'chai', n:'Chai (milk tea, no sugar)', alt:'tea milk', k:25, p:1.3, c:2, f:1.3, u:[['1 mug (250 ml)',250],['1 cup (200 ml)',200]] },
  { id:'black', n:'Black tea or coffee (no sugar)', alt:'coffee kahawa', k:1, p:0, c:0, f:0, u:[['1 mug',250]] },
  { id:'sugar', n:'Sugar', alt:'sukari', k:387, p:0, c:100, f:0, u:[['1 level teaspoon',4],['1 heaped teaspoon',8]] },
  { id:'honey', n:'Honey', alt:'asali', k:304, p:0.3, c:82, f:0, u:[['1 teaspoon',7],['1 tablespoon',21]] },
  { id:'soda', n:'Soda', alt:'coke fanta sprite soft drink', k:42, p:0, c:10.6, f:0, u:[['1 bottle (300 ml)',300],['1 bottle (500 ml)',500]] },
  { id:'juice', n:'Juice (packaged)', alt:'fruit juice', k:46, p:0.3, c:11, f:0, u:[['1 glass (250 ml)',250]] },
  { id:'beer', n:'Beer (Tusker or similar)', alt:'alcohol', k:34, p:0.4, c:2.5, f:0, u:[['1 bottle (500 ml)',500],['1 bottle (330 ml)',330]] },
  { id:'water', n:'Water', alt:'maji', k:0, p:0, c:0, f:0, u:[['1 glass',250],['1 litre',1000]] },

  // Snacks and takeaway
  { id:'samosa', n:'Samosa (meat, fried)', alt:'sambusa', k:261, p:8, c:28, f:13, u:[['1 samosa',60]] },
  { id:'bhajia', n:'Potato bhajia', alt:'kaimati fritters', k:250, p:4, c:30, f:13, u:[['1 portion',150]] }
];
