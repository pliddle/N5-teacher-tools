/* Example programs for the teacher code stepper, grouped. Most are the programs of the code-stepper simulations
   (each group says where from). Edit freely: "inputs" are the values typed; "kind" and "expect" are for Find the error. */
"use strict";
const PROGRAM_GROUPS = [
 {
  "group": "Variables and arithmetic",
  "from": "content/sims/variables",
  "programs": [
   {
    "name": "The bill",
    "about": "Three variables. The right-hand side is worked out first, then stored in the variable on the left.",
    "code": "SET suppers TO 3\nSET price TO 8.75\nSET cost TO suppers * price\nSEND cost TO DISPLAY"
   },
   {
    "name": "Changing a variable",
    "about": "A variable holds one value at a time. Storing a new value replaces the old one.",
    "code": "SET stamps TO 4\nSET stamps TO stamps + 1\nSET stamps TO stamps * 2\nSEND stamps TO DISPLAY"
   },
   {
    "name": "Order of operations",
    "about": "Multiplying and dividing happen before adding and subtracting, unless brackets say otherwise. ^ means 'to the power of'.",
    "code": "SET a TO 2 + 3 * 4\nSET b TO (2 + 3) * 4\nSET c TO 3 ^ 2\nSET d TO 20 / 8\nSEND a TO DISPLAY\nSEND b TO DISPLAY\nSEND c TO DISPLAY\nSEND d TO DISPLAY"
   },
   {
    "name": "From the keyboard",
    "about": "The user types the values. Change them above and press Reset.",
    "code": "RECEIVE adults FROM (INTEGER) KEYBOARD\nRECEIVE children FROM (INTEGER) KEYBOARD\nSET total TO adults * 9 + children * 5\nSEND total TO DISPLAY",
    "inputs": [
     "2",
     "3"
    ]
   }
  ]
 },
 {
  "group": "Joining text",
  "from": "content/sims/joining-text",
  "programs": [
   {
    "name": "A message with a name in it",
    "about": "Text in quotes is shown as written. A name without quotes is a variable, so its value is used. & joins them.",
    "code": "RECEIVE name FROM (STRING) KEYBOARD\nSET message TO \"Thanks \" & name & \", your order is ready\"\nSEND message TO DISPLAY",
    "inputs": [
     "Eilidh"
    ]
   },
   {
    "name": "Quotes or no quotes?",
    "about": "Compare lines 2 and 3. Only one of them uses the variable.",
    "code": "SET name TO \"Ross\"\nSEND \"Hello name\" TO DISPLAY\nSEND \"Hello \" & name TO DISPLAY"
   },
   {
    "name": "Mind the gaps",
    "about": "The computer does not add spaces for you. Compare the two lines.",
    "code": "SET suppers TO 3\nSEND \"You ordered\" & suppers & \"suppers\" TO DISPLAY\nSEND \"You ordered \" & suppers & \" suppers\" TO DISPLAY"
   },
   {
    "name": "Build a code",
    "about": "Joining can make new data, not just messages.",
    "code": "RECEIVE town FROM (STRING) KEYBOARD\nRECEIVE number FROM (STRING) KEYBOARD\nSET ticket TO town & \"-\" & number\nSEND \"Your ticket is \" & ticket TO DISPLAY",
    "inputs": [
     "OBAN",
     "042"
    ]
   }
  ]
 },
 {
  "group": "Decisions: IF",
  "from": "content/sims/decisions",
  "programs": [
   {
    "name": "A discount",
    "about": "The indented line only runs when the condition is TRUE. Try 5, then 6.",
    "code": "RECEIVE suppers FROM (INTEGER) KEYBOARD\nSET cost TO suppers * 8\nIF suppers > 5 THEN\n    SET cost TO cost * 0.9\nEND IF\nSEND cost TO DISPLAY",
    "inputs": [
     "6"
    ]
   },
   {
    "name": "Three paths",
    "about": "The conditions are tested from the top. The first one that is TRUE wins, and the rest are skipped.",
    "code": "RECEIVE points FROM (INTEGER) KEYBOARD\nIF points >= 70 THEN\n    SEND \"Gold\" TO DISPLAY\nELSE IF points >= 50 THEN\n    SEND \"Silver\" TO DISPLAY\nELSE\n    SEND \"Keep going\" TO DISPLAY\nEND IF",
    "inputs": [
     "55"
    ]
   },
   {
    "name": "AND",
    "about": "With AND, both parts must be TRUE. Try changing one input at a time.",
    "code": "RECEIVE age FROM (INTEGER) KEYBOARD\nRECEIVE member FROM (STRING) KEYBOARD\nIF age < 16 AND member = \"Y\" THEN\n    SEND \"Free chips\" TO DISPLAY\nELSE\n    SEND \"Full price\" TO DISPLAY\nEND IF",
    "inputs": [
     "14",
     "Y"
    ]
   },
   {
    "name": "OR and NOT",
    "about": "With OR, one TRUE part is enough. NOT turns TRUE into FALSE.",
    "code": "RECEIVE day FROM (STRING) KEYBOARD\nIF NOT(day = \"Sat\" OR day = \"Sun\") THEN\n    SEND \"Open until 8\" TO DISPLAY\nELSE\n    SEND \"Open until 11\" TO DISPLAY\nEND IF",
    "inputs": [
     "Sat"
    ]
   }
  ]
 },
 {
  "group": "Loops",
  "from": "content/sims/loop-visualiser, rewritten to run in the interpreter, and new",
  "programs": [
   {
    "name": "Fixed loop: a running total",
    "about": "A fixed loop repeats a set number of times. The total is built up inside the loop.",
    "code": "DECLARE total INITIALLY 0\nFOR counter FROM 1 TO 5 DO\n    SET total TO total + counter\nEND FOR\nSEND total TO DISPLAY"
   },
   {
    "name": "Conditional loop: WHILE",
    "about": "The condition is tested at the start, so the loop body may never run. Try a valid age first time.",
    "code": "RECEIVE age FROM (INTEGER) KEYBOARD\nWHILE age < 0 OR age > 120 DO\n    SEND \"Invalid age\" TO DISPLAY\n    RECEIVE age FROM (INTEGER) KEYBOARD\nEND WHILE\nSEND \"Thank you\" TO DISPLAY",
    "inputs": [
     "150",
     "-3",
     "42"
    ]
   },
   {
    "name": "Conditional loop: REPEAT",
    "about": "The condition is tested at the end, so the body always runs at least once.",
    "code": "DECLARE savings INITIALLY 10\nDECLARE weeks INITIALLY 0\nREPEAT\n    SET savings TO savings * 2\n    SET weeks TO weeks + 1\nUNTIL savings > 100\nSEND weeks TO DISPLAY"
   },
   {
    "name": "Fixed loop with an array",
    "about": "The loop counter is the index, so each item is visited in turn. Indexes start at 0.",
    "code": "DECLARE temps INITIALLY [12, 15, 9, 21, 18]\nDECLARE total INITIALLY 0\nFOR index FROM 0 TO 4 DO\n    SET total TO total + temps[index]\nEND FOR\nSEND total / 5 TO DISPLAY"
   },
   {
    "name": "FOR EACH",
    "about": "FOR EACH takes each item of the array in turn, with no index needed.",
    "code": "DECLARE names INITIALLY [\"Morag\", \"Bit\", \"Hamish\"]\nFOR EACH name FROM names DO\n    SEND \"Hello \" & name TO DISPLAY\nEND FOR EACH"
   },
   {
    "name": "A loop inside a loop",
    "about": "The inner loop runs all the way through for every pass of the outer loop. How many lines are displayed?",
    "code": "FOR row FROM 1 TO 3 DO\n    FOR seat FROM 1 TO 2 DO\n        SEND \"Row \" & row & \" seat \" & seat TO DISPLAY\n    END FOR\nEND FOR"
   }
  ]
 },
 {
  "group": "Round, random and length",
  "from": "content/sims/functions",
  "programs": [
   {
    "name": "round",
    "about": "round(value, places). The second parameter is the number of decimal places.",
    "code": "SET average TO 9.4683\nSEND round(average, 2) TO DISPLAY\nSEND round(average, 1) TO DISPLAY\nSEND round(average, 0) TO DISPLAY"
   },
   {
    "name": "random",
    "about": "random(lowest, highest) gives a whole number in that range, including both ends. Press Reset to roll again.",
    "code": "SET dice TO random(1, 6)\nSEND \"You rolled \" & dice TO DISPLAY"
   },
   {
    "name": "length",
    "about": "length(text) counts the characters, including spaces. On an array it counts the items.",
    "code": "RECEIVE name FROM (STRING) KEYBOARD\nSET size TO length(name)\nSEND name & \" has \" & size & \" characters\" TO DISPLAY\nDECLARE menu INITIALLY [\"Fish\", \"Haggis\", \"Chips\"]\nSEND length(menu) TO DISPLAY",
    "inputs": [
     "Fish tea"
    ]
   },
   {
    "name": "A random winner",
    "about": "A random number used as an array index. Three items have indexes 0, 1 and 2.",
    "code": "DECLARE prizes INITIALLY [\"Pen\", \"Mug\", \"Cap\"]\nSET choice TO random(0, 2)\nSEND prizes[choice] TO DISPLAY"
   }
  ]
 },
 {
  "group": "Standard algorithms",
  "from": "content/sims/standard-algorithms",
  "programs": [
   {
    "name": "Input validation: a range",
    "about": "The loop repeats while the entry is INVALID. Try a valid number first time, so the loop never runs.",
    "code": "RECEIVE suppers FROM (INTEGER) KEYBOARD\nWHILE suppers < 1 OR suppers > 20 DO\n    SEND \"Enter a number from 1 to 20\" TO DISPLAY\n    RECEIVE suppers FROM (INTEGER) KEYBOARD\nEND WHILE\nSEND \"Order accepted\" TO DISPLAY",
    "inputs": [
     "25",
     "0",
     "12"
    ]
   },
   {
    "name": "Input validation: a length",
    "about": "Validation is not always a range. Here the PIN must be exactly 4 characters long.",
    "code": "RECEIVE pin FROM (STRING) KEYBOARD\nWHILE length(pin) != 4 DO\n    SEND \"The PIN must have 4 characters\" TO DISPLAY\n    RECEIVE pin FROM (STRING) KEYBOARD\nEND WHILE\nSEND \"PIN accepted\" TO DISPLAY",
    "inputs": [
     "12",
     "12345",
     "2580"
    ]
   },
   {
    "name": "Running total",
    "about": "The total starts at 0 before the loop, is added to inside the loop, and is used after the loop.",
    "code": "DECLARE total INITIALLY 0\nFOR counter FROM 1 TO 4 DO\n    RECEIVE price FROM (REAL) KEYBOARD\n    SET total TO total + price\nEND FOR\nSEND total TO DISPLAY",
    "inputs": [
     "8.75",
     "3",
     "7.5",
     "2.25"
    ]
   },
   {
    "name": "Traversing an array",
    "about": "The loop counter is used as the index, so each item is visited in turn. The average is worked out once, after the loop.",
    "code": "DECLARE takings INITIALLY [412, 380, 455, 390, 720, 965, 610]\nDECLARE total INITIALLY 0\nFOR index FROM 0 TO 6 DO\n    SET total TO total + takings[index]\nEND FOR\nSEND total / 7 TO DISPLAY"
   },
   {
    "name": "Traversing with a condition",
    "about": "Each item is tested as it is visited. Here the loop counts the busy days.",
    "code": "DECLARE takings INITIALLY [412, 380, 455, 390, 720, 965, 610]\nDECLARE busy INITIALLY 0\nFOR EACH day FROM takings DO\n    IF day > 500 THEN\n        SET busy TO busy + 1\n    END IF\nEND FOR EACH\nSEND busy TO DISPLAY"
   }
  ]
 },
 {
  "group": "Find the error",
  "from": "content/sims/error-types",
  "programs": [
   {
    "name": "Program 1",
    "about": "This should display the cost of 4 suppers at 8.75 each.",
    "kind": "Syntax",
    "expect": [
     "35"
    ],
    "code": "SET suppers TO 4\nSET cost TO suppers * 8.75\nSEDN cost TO DISPLAY"
   },
   {
    "name": "Program 2",
    "about": "This should display all three names.",
    "kind": "Execution",
    "expect": [
     "Ali",
     "Bea",
     "Cai"
    ],
    "code": "DECLARE names INITIALLY [\"Ali\", \"Bea\", \"Cai\"]\nFOR index FROM 1 TO 3 DO\n    SEND names[index] TO DISPLAY\nEND FOR"
   },
   {
    "name": "Program 3",
    "about": "Orders of more than 5 suppers should get 10% off. Six suppers at 8 each should cost 43.2.",
    "kind": "Logic",
    "expect": [
     "43.2"
    ],
    "inputs": [
     "6"
    ],
    "code": "RECEIVE suppers FROM (INTEGER) KEYBOARD\nSET cost TO suppers * 8\nIF suppers < 5 THEN\n    SET cost TO cost * 0.9\nEND IF\nSEND cost TO DISPLAY"
   },
   {
    "name": "Program 4",
    "about": "This should display Child price for anyone under 12.",
    "kind": "Syntax",
    "expect": [
     "Child price"
    ],
    "inputs": [
     "9"
    ],
    "code": "RECEIVE age FROM (INTEGER) KEYBOARD\nIF age < 12\n    SEND \"Child price\" TO DISPLAY\nEND IF"
   },
   {
    "name": "Program 5",
    "about": "This should add up three prices and display the total: 2 + 3 + 5 = 10.",
    "kind": "Logic",
    "expect": [
     "10"
    ],
    "inputs": [
     "2",
     "3",
     "5"
    ],
    "code": "DECLARE total INITIALLY 0\nFOR counter FROM 1 TO 3 DO\n    RECEIVE price FROM (REAL) KEYBOARD\n    SET total TO price\nEND FOR\nSEND total TO DISPLAY"
   }
  ]
 }
];
