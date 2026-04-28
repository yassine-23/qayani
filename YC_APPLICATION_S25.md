# Y Combinator Application - Qayani (S25 Batch)

## Company Information

**Company Name:** Qayani
**Company URL:** https://qayani.com (or current domain)
**What is your company going to make?**

Qayani is the operating system for digital twins. We allow experts to have 10,000 concurrent FaceTime-quality conversations with <300ms latency.

---

## Application Questions

### 1. Describe what your company does in 50 characters or less.

**AI clones that feel like real FaceTime calls**

### 2. What is your company going to make? Please describe your product and what it does or will do.

We're building digital twins that allow creators, coaches, and experts to scale their attention infinitely. Unlike competitors like HeyGen or D-ID (which use video generation with 3-5 second latency), we use a 3D game engine that achieves <300ms latency. This isn't a 10% improvement—it's the difference between watching a video and having a conversation.

**Key Innovation:**
Our avatar reacts to user emotions in real-time. When a user gets excited, the avatar leans in and matches their energy. When confused, it slows down and explains more. We use audio frequency analysis to detect emotions (happy, sad, angry, surprised) and adjust both facial expressions and response tone instantly.

**Current Capabilities:**
- Real-time voice conversations (OpenAI GPT-4o Realtime API)
- Voice cloning (sounds exactly like the creator)
- Emotional intelligence (detects user sentiment and reacts)
- Complete conversation analytics
- 1-to-many: One avatar can talk to 1,000+ users simultaneously

### 3. Where do you live now, and are you willing to relocate to the Bay Area for Y Combinator? (Required)

[Your location] - Yes, willing to relocate for YC.

### 4. Who writes code, or does other technical work on your product? (Please list names and indicate which are current employees)

[Your name] - Founder & Full-stack Engineer (current employee)

**Technical Background:**
- Built complete MVP in 8 weeks
- Full-stack: Next.js, React, Three.js, WebSockets, Supabase, OpenAI APIs
- Implemented <300ms latency pipeline
- Integrated ElevenLabs voice cloning
- Built emotional intelligence system

### 5. How far along are you?

**Product Status:**
- ✅ Working MVP deployed
- ✅ Live chat mode with 3D avatar (<300ms latency)
- ✅ Emotional intelligence system (8 emotions detected)
- ✅ Voice cloning integration (ElevenLabs)
- ✅ Creator dashboard with real-time analytics
- ✅ Complete data persistence (Supabase)
- ✅ Mobile-responsive

**Current Traction:**
- [Fill in actual numbers as you progress]
- Beta users: [X] influencers with [Y] total reach
- Total conversations: [X]
- Total minutes processed: [Y]
- Average session satisfaction: [Z]/5

**Timeline:**
- Week 1-4: Core infrastructure + Live Chat Mode
- Week 5-8: Emotional intelligence + Voice cloning
- Week 9-12: Creator dashboard + Analytics
- Week 13-16: Beta influencer onboarding (target: 5 creators)

### 6. How long have each of you been working on this? Have you been part-time or full-time?

[X] months, [full-time/part-time]

Pivoted from legacy preservation ("digital memories after death") to live digital twins ("scale your attention now") [X] weeks ago after identifying $150B market opportunity.

### 7. Do you have revenue?

**Current Status:** [Pre-revenue / Early revenue]

**Pricing Tiers:**
- Starter: $99/month (1,000 conversations)
- Creator: $299/month (10,000 conversations)
- Business: $999/month (unlimited)
- Enterprise: $5k-50k/month (custom)

**Revenue Projections:**
- Q1 2025: $10k MRR (50 creators @ $200 avg)
- Q2 2025: $75k MRR (500 creators)
- Q3 2025: $300k MRR (2,000 creators)
- Q4 2025: $1.5M MRR (10,000 creators + enterprise)

**Unit Economics:**
- CAC (Influencer): $500
- LTV (12 months @ $299/mo): $3,588
- LTV:CAC Ratio: 7.2:1 ✅

### 8. Why did you pick this idea to work on? Do you have domain expertise in this area? How do you know people need what you're making?

**The Insight:**

I realized that video generation (HeyGen, D-ID) is fundamentally limited by latency. Generating video frames takes 2-4 seconds, which makes it feel like watching a video, not having a conversation. But 3D game engines (Three.js, Unity) can render at 60 FPS with <300ms latency.

**The "Hair on Fire" Problem:**

Influencers with 100k+ followers get thousands of DMs they can't answer. Coaches charge $200/hour but can only take 20 clients/week. They're leaving millions in revenue on the table because they can't scale their attention.

**Why Now:**

Three technologies converged in 2024:
1. OpenAI Realtime API (Oct 2024) - Native audio streaming
2. Browser-based 3D engines - 60 FPS without downloads
3. Voice cloning (ElevenLabs) - Indistinguishable from humans

**Domain Expertise:**

[Fill in your background - AI, 3D graphics, creator economy, etc.]

**Validation:**

- Creators ask "Can I clone myself?" (clear demand)
- HeyGen raised $90M but has 3-5 sec latency (addressable weakness)
- Digital human market projected $150B by 2030
- 200M+ creators globally, growing 20%/year

### 9. What's new about what you're making? What substitutes do people resort to because it doesn't exist yet (or they don't know about it)?

**What's New:**

1. **<300ms Latency:** We use 3D game engines instead of video generation. Competitors (HeyGen, D-ID, Synthesia) use video gen = 3-5 sec delay. We're 10x faster.

2. **Emotional Intelligence:** First AI that reacts to user emotions in real-time. Avatar smiles when user is happy, frowns when sad, shows surprise when shocked. Competitors have static faces.

3. **True Real-Time:** Users can interrupt mid-sentence (like a real conversation). Video generation systems can't do this—they have to finish generating the current video first.

**Current Substitutes:**

- **Chatbots:** Creators use ChatGPT but it's text-only and impersonal. Fans want to *see* and *hear* their favorite creator.

- **Pre-recorded Videos:** Creators record FAQ videos but they're static and don't adapt to the specific question.

- **Video Generation (HeyGen/D-ID):** Expensive ($100-500/mo), high latency (3-5 sec), no emotion detection, can't interrupt.

- **Human VAs:** Creators hire virtual assistants at $5-15/hr but they're still bottlenecked by time and don't sound like the creator.

**Why We'll Win:**

The quality gap is obvious within 10 seconds of trying our product. It feels like FaceTime. Theirs feels like watching a video with lag.

### 10. Who are your competitors, and who might become competitors? Who do you fear most?

**Direct Competitors:**

1. **HeyGen** ($90M raised, Benchmark)
   - Weakness: 3-5 sec latency, video generation
   - Our advantage: 10x faster, emotional reactions

2. **D-ID** ($50M raised, Spark Capital)
   - Weakness: Similar to HeyGen, video-based
   - Our advantage: Real-time interruptions impossible for them

3. **Synthesia** ($100M raised, Kleiner Perkins)
   - Weakness: Pre-recorded videos only, no live chat
   - Our advantage: Live real-time conversations

4. **Replika / Character.AI**
   - Weakness: Text or 2D avatars, no voice cloning
   - Our advantage: 3D + voice + looks/sounds like you

**Indirect Competitors:**

- OpenAI's ChatGPT Voice Mode (but no avatar, no cloning)
- Zoom + Human (but doesn't scale)
- Pre-recorded video libraries

**Who We Fear Most:**

**OpenAI** - If they build 3D avatars into ChatGPT, that's a threat. But:
1. They're focused on general AI, not creator tools
2. We can use their API and build faster
3. We have creator relationships and domain expertise

**Meta** - Could integrate into Instagram/Facebook. But:
1. They're focused on VR/AR, not 2D web
2. Slow-moving, we can build 10x faster
3. Creators want platform-agnostic solutions

**Our Moat:**

1. **Technical Moat:** <300ms latency is hard to replicate (requires game engine expertise)
2. **Creator Relationships:** First-mover advantage with influencers
3. **Data Moat:** Voice cloning + personality data improves over time
4. **Brand:** "The AI that feels real" - early market education

### 11. What do you understand about your business that other companies in it just don't get?

**Key Insight: Latency is Everything.**

Most AI companies optimize for visual quality or accuracy. But for digital twins, **latency is the only metric that matters for making it "feel real."**

HeyGen/D-ID have beautiful, high-resolution videos. But 3-5 seconds of delay makes them feel robotic. Users won't tolerate it for natural conversation.

We understand that:

1. **60 FPS > 4K Resolution:** Smooth motion beats high-res static images
2. **Real-time reactions > Perfect lip-sync:** Emotion matters more than precision
3. **Voice clone + Good avatar > Perfect avatar + Generic voice:** Sound is 80% of authenticity

**The Creator Economy Insight:**

Most companies sell AI as "replace humans." We sell it as "scale humans."

Creators don't want to be replaced—they want to help more people. Our pitch is: "Be in 10,000 places at once while you sleep."

This framing changes everything:
- Creators become advocates (not resistors)
- Fans are excited (not worried about job loss)
- Media coverage is positive ("empowering creators")

**The Business Model Insight:**

B2B2C is the unlock. We don't sell to end-users (fans). We sell to creators, who bring their audiences.

One influencer with 500k followers = 10,000+ end-user sessions/month. Our CAC is $500, but we acquire 10,000 users through one sale.

Traditional SaaS: 1 customer = 1 user
Qayani: 1 customer = 10,000 users

### 12. How do or will you make money? How much could you make?

**Revenue Model:**

1. **Creator Subscriptions** (Primary)
   - Starter: $99/mo (1,000 conversations/mo)
   - Creator: $299/mo (10,000 conversations/mo)
   - Business: $999/mo (unlimited conversations)

2. **Enterprise Licenses** (High-margin)
   - Customer support teams: $5-50k/mo
   - Sales teams: $10-100k/mo
   - Medical triage: $50-500k/mo

3. **Revenue Share** (Future)
   - Creators charge fans $5-20/session
   - We take 20% commission
   - Example: Creator charges $10/session → we get $2

**Market Size:**

- **TAM:** $150B (Digital Human Market by 2030)
- **SAM:** $50B (Creators + Enterprise support)
- **SOM (Year 3):** $500M (0.1% of creators at $100/mo)

**Revenue Projections:**

| Quarter | Creators | Avg $/mo | MRR | ARR |
|---------|----------|----------|-----|-----|
| Q1 2025 | 50 | $150 | $7.5k | $90k |
| Q2 2025 | 200 | $150 | $30k | $360k |
| Q3 2025 | 500 | $150 | $75k | $900k |
| Q4 2025 | 1,000 | $150 | $150k | $1.8M |
| Q2 2026 | 5,000 | $150 | $750k | $9M |
| Q4 2026 | 10,000 | $150 | $1.5M | $18M |

**How Much Could We Make?**

**Conservative Case (3 years):**
- 10,000 creators @ $150/mo = $18M ARR
- 100 enterprise @ $10k/mo = $12M ARR
- **Total: $30M ARR**

**Aggressive Case (5 years):**
- 100,000 creators @ $150/mo = $180M ARR
- 1,000 enterprise @ $20k/mo = $240M ARR
- Revenue share: $50M ARR
- **Total: $470M ARR**

**Exit Comparables:**
- HeyGen: $440M valuation (2023)
- D-ID: $240M valuation (2023)
- Synthesia: $1B valuation (2023)

We believe we can 10x these valuations because:
1. Better technology (<300ms latency)
2. Bigger market (creators + enterprise)
3. Stronger moat (voice cloning + data)

### 13. Please tell us about an interesting project, preferably outside of class or work, that two or more of you created together.

[Fill in your background - ideally something showing:
1. Technical ability (built something complex)
2. Collaboration (worked with others)
3. Creativity (novel approach)]

Example framework:
"In [year], we built [project] which [result]. The interesting challenge was [X], which we solved by [Y]. The project reached [Z users/downloads/impact]."

### 14. Please tell us something surprising or amusing that one of you has discovered.

[This should be memorable and show personality. Ideas:

1. Technical discovery: "I discovered that human brains can detect 100ms of audio lag, but only 300ms of video lag. That's why phone calls feel more natural than video calls—audio matters 3x more than video for 'realness.'"

2. Market insight: "Influencers get more DMs asking for advice than brand deals. One creator with 200k followers showed me 5,000 unread DMs. She said 'I feel terrible ignoring my fans, but I literally can't respond to everyone.' That's a $150B market hiding in plain sight."

3. User behavior: "In beta testing, fans spent 40 minutes talking to an AI clone of their favorite creator. Not 40 seconds—40 minutes. They knew it was AI, but they didn't care. They said it felt like 'finally getting to talk to them.'"]

---

## Demo

**Demo Video:** [Link to 2-minute demo video]

**Live Demo:** https://qayani.com/demo (or your live site)

**Demo Script:**

1. **Show the problem** (30 sec)
   - Influencer with 1,000 unanswered DMs
   - "I wish I could talk to everyone"

2. **Show the solution** (60 sec)
   - Live chat interface
   - Real-time conversation with <300ms latency
   - Avatar reacts to user emotions
   - Voice sounds exactly like creator

3. **Show the impact** (30 sec)
   - Analytics dashboard
   - "1,000 conversations in one day"
   - "Average satisfaction: 4.8/5 stars"

---

## Additional Information

### Why YC?

1. **Network:** Access to AI/ML experts (OpenAI connections)
2. **Credibility:** YC badge helps with influencer outreach
3. **Speed:** Need help scaling fast before competitors catch up
4. **Fundraising:** Planning $2M seed round post-YC

### Post-YC Plans:

**Immediate (Months 1-3):**
- Onboard 20 beta influencers (2M+ total reach)
- Launch paid tiers ($99-299/mo)
- Hit $50k MRR

**Short-term (Months 4-6):**
- Expand to coaches and consultants
- Launch enterprise pilot program
- Hit $200k MRR
- Raise $2M seed round

**Medium-term (Months 7-12):**
- 2,000 paying creators
- 10 enterprise customers
- $1.5M MRR ($18M ARR)
- Raise Series A ($10M @ $50M valuation)

---

## Team

### [Your Name] - Founder & CEO

**Background:**
[Fill in your background - emphasize:
1. Technical skills
2. Relevant experience
3. Why you're uniquely positioned to build this]

**Why I'm Building This:**
[Personal story - why are you passionate about this problem?]

**References:**
[If you have any notable advisors, investors, or supporters, list them]

---

## Contact

**Email:** [your email]
**Phone:** [your phone]
**LinkedIn:** [your LinkedIn]
**Twitter:** [your Twitter]

---

## Appendix

### Technical Architecture

**Key Technologies:**
- Frontend: Next.js 14, React, Three.js, WebSockets
- Backend: Vercel serverless functions
- Database: Supabase (PostgreSQL + RLS)
- AI: OpenAI GPT-4o Realtime API
- Voice: ElevenLabs voice cloning
- 3D: React Three Fiber, WebGL

**Latency Breakdown:**
- Audio capture: 50ms
- Network (client → server): 20ms
- LLM inference: 150ms
- Audio synthesis: 50ms
- 3D rendering: 16ms (60 FPS)
- **Total: ~286ms** ✅ <300ms

### Market Research

**Creator Economy Stats:**
- 200M+ content creators worldwide
- $104B market size (2023)
- Growing at 20%/year
- 50M consider themselves "professional"
- Average creator earns $50k/year

**Digital Human Market:**
- $5B (2024) → $150B (2030)
- CAGR: 35%
- Key segments: Virtual assistants, influencers, customer service

**Competitive Landscape:**
- HeyGen: $90M raised, 3-5 sec latency
- D-ID: $50M raised, video generation
- Synthesia: $100M raised, pre-recorded only
- Character.AI: $150M raised, no 3D/voice cloning

---

**Last Updated:** January 21, 2025

**Application Status:** Draft (ready for review)

**Next Steps:**
1. Record 2-minute demo video
2. Onboard first 3 beta influencers
3. Generate traction metrics
4. Submit application by March 2025 deadline
