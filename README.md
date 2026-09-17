# Artisan Voice Link

Build a Complete Voice-First AI Market Linkage Platform for Marginalized Artisans

PROJECT CONTEXT

Build a polished, production-quality frontend for a college mini-project based on the Smart India Hackathon problem statement:

“AI-Driven Market Linkage and Smart Cataloging Mobile Application for Marginalized Artisans.”

The application helps marginalized artisans who may have low digital literacy, limited technical skills, and language barriers sell their handmade products digitally.

The most important innovation of this application is:

The artisan should NOT need to understand how to navigate a complicated website. They should be able to speak naturally to an AI assistant, and the application should perform actions for them.

Example:

Artisan: “This is my saree, list it.”

The application should understand the intent, analyze the product, generate a catalog, suggest pricing, ask only for missing information, and finally create the product listing.

1. CORE UX PHILOSOPHY

DO NOT design this like a traditional e-commerce admin dashboard.

The target user may not be comfortable with:

Forms

Menus

Tables

Typing

English

Complicated navigation

Technical terminology

Therefore:

PRIMARY INTERACTION

VOICE

SECONDARY INTERACTION

Large visual buttons and simple cards

TERTIARY INTERACTION

Traditional forms should exist only as fallback/editing interfaces.

The application should feel like:

“An AI business assistant that understands the artisan.”

NOT:

“A complicated seller portal.”

2. DESIGN PERSONALITY

Create a design that communicates:

Indian craftsmanship

Trust

Warmth

Simplicity

Modern AI technology

Accessibility

Premium quality

Human-centered design

Avoid making it look overly corporate or like a generic SaaS dashboard.

Use subtle visual inspiration from Indian handicrafts and textiles, but DO NOT make the interface visually cluttered.

Use:

Warm neutral backgrounds

Subtle textile-inspired patterns

Soft rounded cards

Large typography

High contrast

Generous spacing

Simple icons

Friendly illustrations

Elegant micro-interactions

The visual language should feel like:

Traditional craft × Modern AI

3. RESPONSIVE REQUIREMENT

Build the interface mobile-first, because the real solution is intended primarily as a mobile application.

However, also make it responsive for:

Mobile

Tablet

Desktop

Desktop should not simply stretch the mobile UI.

Create a proper desktop adaptation.

4. MAIN APPLICATION STRUCTURE

The application should contain these major areas:

Welcome / onboarding

Language selection

Artisan profile

Main AI assistant

Voice interaction

Product capture

AI product analysis

AI image studio

AI-generated catalog

AI pricing assistant

Product confirmation

My products

Product details

Market linkage

Buyer discovery

Orders / sales

Notifications

Profile/settings

Help/accessibility

5. ONBOARDING EXPERIENCE

Create a very simple onboarding flow.

Screen 1 — Welcome

Large heading:

“Your Craft. Your Market. Your Voice.”

Subtitle:

“Sell your handmade products with the help of AI.”

Large illustration showing an artisan using a phone.

Primary button:

Start

Secondary option:

I already have an account

Do not overload this screen.

6. LANGUAGE SELECTION

Immediately after onboarding:

Heading:

“Choose your language”

Display large cards:

తెలుగు

हिन्दी

English

Tamil

Kannada

Marathi

Each card should have:

Language name

Native script

Speaker icon

Example:

┌──────────────────────┐
│       తెలుగు         │
│        🔊            │
└──────────────────────┘


The selected language should affect the assistant experience.

7. ARTISAN PROFILE SETUP

Keep profile creation extremely simple.

Ask:

“Tell us about yourself.”

Allow:

Voice input

“నా పేరు లక్ష్మి. నేను చేనేత చీరలు తయారు చేస్తాను.”

The application should visually show the recognized information:

Name
Lakshmi

Craft
Handloom textiles

Location
Telangana


Allow the artisan to confirm.

Do NOT force them to fill a large form.

8. MAIN HOME SCREEN — MOST IMPORTANT SCREEN

This is the heart of the application.

The screen should be centered around one huge AI assistant.

Header:

“Namaste, Lakshmi 👋”

Subtitle:

“What would you like to do?”

Then a large central voice interaction area.

Example:

              ✨

       How can I help you?

              🎙️

        Tap and speak

              ✨


The microphone should be the most visually prominent element on the screen.

Below it, provide a few example commands:

“List my new product”

“Show my products”

“What should I charge?”

“Show my sales”

“Find buyers”

These should be tappable example suggestions.

9. VOICE INTERACTION STATE

When the artisan taps the microphone, transform the UI.

Show:

       Listening...

          ◉
       ~~~~~~~
     ~~~~~~~~~~~


Use a beautiful animated waveform.

Text:

“Listening…”

Then display the recognized speech live.

Example:

“This is my new saree, list it.”

After recording:

Show:

“I heard:”

“This is my new saree, list it.”

Buttons:

Confirm

Try again

Keep this extremely simple.

10. AI THINKING STATE

After confirmation, show an elegant AI processing animation.

Example:

        ✨ AI is working

        Understanding your request

        ✓ Understanding request
        ✓ Analyzing product
        ○ Creating catalog
        ○ Checking price


Do NOT show technical terms such as:

LLM

API

JSON

NLP

embeddings

inference

The artisan doesn't care about the technology.

11. PRODUCT CAPTURE FLOW

When the user says:

“List my saree.”

If no image exists, the assistant should respond:

“Sure. Please show me the saree.”

Display:

Camera

Large camera button.

Secondary:

Choose from gallery

Camera interface should have a simple product framing guide.

Example:

       ┌──────────────────┐
       │                  │
       │    PRODUCT       │
       │      HERE        │
       │                  │
       └──────────────────┘

      Keep the product visible


12. PRODUCT ANALYSIS SCREEN

After capturing the image, show the product prominently.

Heading:

“I found a saree.”

Then display AI-detected information:

Category
Saree

Color
Blue

Pattern
Traditional floral

Craft
Handcrafted textile


Use confidence indicators only when useful.

Do NOT overwhelm the user with technical AI details.

Button:

Looks correct

Secondary:

Change something

13. AI IMAGE STUDIO

Create a visually impressive image enhancement screen.

Title:

“Let's make your product look ready for the market.”

Show:

BEFORE / AFTER comparison

Before:

Original artisan photo

After:

Clean professional product image

AI actions:

Remove background

Improve lighting

Clean background

Improve framing

Use interactive before/after slider.

Primary button:

Use this image

Secondary:

Keep original

14. AI AUTO-CATALOG SCREEN

Heading:

“I've prepared your product listing.”

Show a premium product card.

Example:

┌─────────────────────────────┐
│                             │
│        PRODUCT IMAGE        │
│                             │
├─────────────────────────────┤
│ Traditional Blue Saree      │
│                             │
│ Handcrafted textile with    │
│ traditional floral motifs.  │
│                             │
│ Category: Saree             │
│ Craft: Handloom             │
│ Color: Blue                 │
└─────────────────────────────┘


Allow the artisan to speak:

“Change the name.”

or tap:

Edit

Every field should be editable through voice.

15. AI PRICING ASSISTANT

Create a dedicated pricing experience.

Heading:

“What should you charge?”

Show:

Estimated production cost
₹850

Similar products
₹1,100 – ₹1,500

AI suggested range
₹1,200 – ₹1,450


Use a beautiful price-range visualization.

Then:

“I suggest ₹1,300.”

Buttons:

Use ₹1,300

Choose another price

Ask me why

The artisan can also say:

“Set it to 1400.”

The interface should visibly update the price.

16. MISSING INFORMATION FLOW

The AI should NOT ask for everything.

If it knows:

Product category

Color

Description

Image

but doesn't know the price:

Only ask:

“What price would you like?”

If the artisan says:

“I don't know.”

Assistant:

“I can suggest one based on similar products. Would you like me to?”

Button:

Yes, suggest a price

This conversational flow is a major feature.

17. FINAL CONFIRMATION SCREEN

Before listing, show a simple summary.

Heading:

“Your product is ready.”

Display:

        PRODUCT IMAGE

Traditional Blue Saree

₹1,300

Handcrafted textile
Traditional floral design


Then:

Large primary button

List Product

Also allow:

Change something

But the artisan should be able to simply say:

“List it.”

The voice assistant should trigger the same action.

18. SUCCESS STATE

After listing:

Use a satisfying but subtle success animation.

Large checkmark.

Text:

“Your saree is now listed.”

Then:

“Buyers can now discover your product.”

Buttons:

View Product

List Another Product

Go Home

19. MY PRODUCTS SCREEN

Do NOT use a dense spreadsheet.

Use visual product cards.

Each card:

┌─────────────────────┐
│                     │
│      IMAGE          │
│                     │
├─────────────────────┤
│ Blue Handloom Saree │
│ ₹1,300              │
│ 🟢 Listed           │
└─────────────────────┘


Large cards.

Provide voice action:

🎙️ “Show me my sarees.”

20. PRODUCT DETAILS

Product details page should show:

Product image

Product name

Description

Price

Category

Craft type

Materials

Availability

Views

Buyer interest

Status

But keep it visually simple.

Include:

“Ask AI about this product”

The artisan can say:

“Change the price to 1500.”

or

“Remove this product.”

21. MARKET LINKAGE SCREEN

This is a major SIH-specific feature.

Title:

“Find buyers for your craft.”

Show categories:

Potential Buyers

Retailers

Wholesalers

Businesses

Institutional buyers

Government opportunities

Local stores

Use cards rather than complicated tables.

Example:

┌──────────────────────────┐
│ 🏪 Retail Buyers         │
│                          │
│ 12 potential matches     │
│                          │
│ View buyers →            │
└──────────────────────────┘


22. AI BUYER MATCHING

Create a screen:

“Buyers interested in products like yours.”

Each buyer card:

ABC Handicrafts

Looking for:
Handloom Sarees

Location:
Hyderabad

Quantity:
50–100 pieces

Match:
High compatibility


Do NOT make unsupported claims about real buyers.

For the college prototype, clearly structure this around demo/mock buyer data unless real integrations are implemented.

23. SALES SCREEN

Create a very simple analytics section.

Title:

“Your business at a glance.”

Show:

Products Listed
24

Products Sold
8

Total Sales
₹24,500

Buyer Interest
37


Use simple charts.

Avoid complex business analytics.

The artisan should understand the screen within seconds.

24. VOICE COMMAND CENTER

Include a persistent microphone interaction throughout the application.

The artisan should be able to say things like:

“List this product.”

“Show my products.”

“Change the saree price.”

“What have I sold?”

“Find buyers for my baskets.”

“Remove this product.”

“Help me.”

Create a floating microphone button.

When activated, open a bottom-sheet voice assistant.

25. AI ASSISTANT BOTTOM SHEET

When the microphone is activated from anywhere:

┌──────────────────────────────┐
│                              │
│       AI Assistant           │
│                              │
│       🎙️                    │
│                              │
│       Listening...           │
│                              │
│ “Change the price of my      │
│  blue saree to 1500.”        │
│                              │
│       [Cancel]               │
└──────────────────────────────┘


After understanding:

I can change the blue saree
price to ₹1,500.

[Confirm]     [Change]


Never perform potentially destructive actions without confirmation.

26. ACCESSIBILITY

This is extremely important for the target audience.

Implement:

Large touch targets

Large fonts

High contrast

Simple vocabulary

Minimal text

Voice feedback

Language switching

Text-to-speech responses

Clear icons

Avoid icon-only critical actions

Never rely solely on color to communicate status

The application should remain usable by someone with limited reading ability.

27. NAVIGATION

Mobile bottom navigation:

🏠 Home
📦 Products
🛍️ Buyers
📊 Sales
👤 Profile


BUT:

The navigation should never be the primary way the artisan operates the application.

The AI assistant should be accessible everywhere.

Place a prominent floating microphone button above the navigation.

28. AI RESPONSE STYLE

The assistant should be:

Friendly

Respectful

Short

Simple

Encouraging

Non-technical

Instead of:

“Your CREATE_PRODUCT operation has completed successfully.”

Say:

“Your saree is listed successfully.”

Instead of:

“Insufficient product metadata.”

Say:

“I need to know the price before I can list it.”

29. IMPORTANT VOICE-FIRST PRINCIPLE

Every major UI action should have an equivalent voice command.

Create a conceptual mapping:

Voice Command
      ↓
Intent
      ↓
Application Action


Examples:

“List this saree”
        ↓
CREATE_PRODUCT

“Show my products”
        ↓
GET_PRODUCTS

“Change saree price to 1500”
        ↓
UPDATE_PRODUCT

“Remove this product”
        ↓
UNLIST_PRODUCT

“What did I sell?”
        ↓
GET_SALES

“Find buyers”
        ↓
GET_BUYERS


The UI should visually reflect these actions.

30. DEMO MODE

Because this is a college mini-project, include a hidden or clearly labeled Demo Mode for presentation purposes.

Demo Mode should allow:

Sample artisan

Sample products

Sample buyers

Sample sales

Sample AI responses

This allows the complete UI to be demonstrated even without production marketplace integrations.

Do NOT make mock data look like genuine real-world buyer data.

31. MICRO-INTERACTIONS

Add polished animations:

Microphone pulsing while listening

Waveform responding to speech

AI processing animation

Product image transformation

Price recommendation animation

Listing success animation

Smooth page transitions

Card hover/tap effects

Skeleton loading states

Animations should be subtle and fast.

Do NOT make the application feel like a flashy gaming website.

32. ERROR STATES

Design proper states for:

Speech not understood

“I couldn't understand that. Please try again.”

Internet problem

“Connection lost. Please try again.”

Image unclear

“The product isn't clearly visible. Try taking another photo.”

Missing information

“I need the price before I can list this product.”

AI failure

“I couldn't prepare the listing right now. You can try again.”

Every error should provide an obvious next action.

33. TECHNICAL FRONTEND REQUIREMENTS

Use:

React

Vite

JavaScript/TypeScript as appropriate

React Router

Tailwind CSS or another clean styling system

Lucide icons or another consistent icon library

Build reusable components:

VoiceAssistant
VoiceRecorder
Waveform
AIProcessing
ProductCard
ProductDetails
ProductCapture
ImageEnhancer
CatalogPreview
PricingAssistant
BuyerCard
SalesSummary
BottomNavigation
LanguageSelector
ConfirmationModal


Use clean component architecture.

Do not create one enormous component.

34. MOCK DATA

Initially use realistic mock data so the UI works without a backend.

Create mock data for:

Artisans

Lakshmi
Telangana
Handloom textiles


Products

Include:

Sarees

Bamboo baskets

Pottery

Wooden crafts

Embroidery

Jewelry

Buyers

Create clearly fictional/demo buyer organizations.

Sales

Create realistic sample transactions.

35. IMPORTANT PRODUCT FLOW TO PERFECT

The most important demo flow is:

HOME
 ↓
Tap microphone
 ↓
“This is my saree, list it.”
 ↓
Speech recognized
 ↓
AI understands CREATE_PRODUCT
 ↓
Camera/product image
 ↓
AI analyzes product
 ↓
AI improves image
 ↓
AI generates catalog
 ↓
AI asks only missing information
 ↓
AI suggests price
 ↓
Artisan confirms
 ↓
Product created
 ↓
Success animation
 ↓
Product appears in My Products


This flow should feel seamless.

36. VISUAL HIERARCHY

On every screen prioritize:

1. What should the artisan know?

2. What should the artisan do?

3. How can the artisan speak instead?

Never show technical implementation details.

37. FINAL QUALITY BAR

The result should look like a real startup product, not a college CRUD application.

The interface should communicate:

“Technology is adapting to the artisan — the artisan does not have to adapt to technology.”

This should be the central design philosophy.

Create every required screen, navigation flow, empty state, loading state, success state, error state, modal, voice interaction state, and responsive layout.

Make the complete frontend visually consistent and interconnected.

Prioritize the voice-first product listing journey above all other features.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/599d7e21-c6a2-4040-8e93-fef5c6ab464a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
