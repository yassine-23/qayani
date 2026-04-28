# GEMINI AGENTIC SAAS - IMPLEMENTATION GUIDE

## Quick Start

### Prerequisites

1. **Google AI Studio Account**: Get Gemini 3 Pro API key
2. **Nono Banana Pro Access**: API credentials
3. **Playwright MCP Setup**: Install and configure
4. **Development Environment**: Node.js 18+, Python 3.9+

### Installation

```bash
# 1. Clone the project
git clone https://github.com/yourusername/gemini-agentic-saas
cd gemini-agentic-saas

# 2. Install dependencies
npm install
pip install -r requirements.txt

# 3. Install Gemini CLI
npm install -g @google/generative-ai-cli
gemini-cli --version

# 4. Configure API keys
cp .env.example .env
# Edit .env with your API keys

# 5. Install Playwright MCP
npx playwright install chromium
npx @modelcontextprotocol/server-playwright install
```

### Environment Variables

```bash
# .env
GOOGLE_GEMINI_API_KEY=your_gemini_3_pro_key
NONO_BANANA_PRO_API_KEY=your_nono_banana_key
PLAYWRIGHT_MCP_URL=http://localhost:9222

# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Monitoring
SENTRY_DSN=your_sentry_dsn
PLAUSIBLE_DOMAIN=your_domain
```

---

## Setting Up Agents

### 1. Master Orchestrator

```python
# agents/orchestrator.py
from google import generativeai as genai

class MasterOrchestrator:
    def __init__(self):
        genai.configure(api_key=os.getenv("GOOGLE_GEMINI_API_KEY"))
        self.model = genai.GenerativeModel('gemini-3-pro-preview')
        self.agents = {
            "architect": ArchitectAgent(),
            "design": DesignDirector(),
            "frontend": FrontendBuilder(),
            "backend": BackendBuilder(),
            "qa": QAAgent(),
            "monitor": MonitorAgent()
        }

    async def build_saas(self, user_request: str):
        """Main entry point - builds entire SaaS from request"""

        # Step 1: Analyze requirements
        print("🤔 Analyzing requirements...")
        analysis = await self.analyze_requirements(user_request)

        # Step 2: Create master plan
        print("📋 Creating project plan...")
        plan = await self.create_master_plan(analysis)

        # Step 3: Execute plan
        print("🚀 Starting implementation...")
        await self.execute_plan(plan)

    async def analyze_requirements(self, request):
        """Use Gemini 3 Pro to understand requirements"""
        prompt = f"""
        Analyze this SaaS application request and extract:
        1. Core features needed
        2. Recommended tech stack
        3. Database schema requirements
        4. API endpoints needed
        5. UI pages required
        6. Estimated complexity

        Request: {request}

        Respond in JSON format.
        """

        response = await self.model.generate_content_async(prompt)
        return json.loads(response.text)

    async def create_master_plan(self, analysis):
        """Generate comprehensive task list"""
        prompt = f"""
        Create a detailed implementation plan for this SaaS application:

        {json.dumps(analysis, indent=2)}

        Generate tasks in this order:
        1. Database schema design
        2. API architecture
        3. UI/UX design (with Nono Banana Pro)
        4. Frontend implementation
        5. Backend implementation
        6. Testing (with Playwright)
        7. Deployment
        8. Monitoring setup

        For each task, specify:
        - Task name
        - Agent responsible
        - Dependencies
        - Estimated time
        - Success criteria

        Respond in JSON format.
        """

        response = await self.model.generate_content_async(prompt)
        return json.loads(response.text)

    async def execute_plan(self, plan):
        """Delegate tasks to specialized agents"""
        for phase in plan.phases:
            print(f"\n📦 Phase: {phase.name}")

            for task in phase.tasks:
                agent = self.agents[task.agent]

                print(f"  → {task.name} ({task.agent})")

                try:
                    result = await agent.execute(task)

                    if not result.success:
                        # Escalate to stuck agent
                        resolution = await self.escalate_to_stuck(task, result)
                        if resolution.retry:
                            result = await agent.execute(task, resolution.guidance)

                    print(f"  ✓ {task.name} completed")

                except Exception as e:
                    print(f"  ✗ {task.name} failed: {e}")
                    resolution = await self.escalate_to_stuck(task, e)

    async def escalate_to_stuck(self, task, error):
        """Human escalation point"""
        print(f"\n⚠️  Need human input for: {task.name}")
        print(f"Error: {error}")

        # Present options to user
        options = await self.generate_resolution_options(task, error)

        # Use AskUserQuestion tool here
        choice = input(f"Choose resolution: {options}")

        return {"retry": True, "guidance": choice}
```

### 2. Design Director with Nono Banana Pro

```python
# agents/design_director.py
import requests
from PIL import Image
import io

class DesignDirector:
    def __init__(self):
        self.nono_banana_api = os.getenv("NONO_BANANA_PRO_API_KEY")
        self.gemini = genai.GenerativeModel('gemini-3-pro-preview')

    async def execute(self, task):
        """Generate UI designs with Nono Banana Pro"""

        if task.type == "design_system":
            return await self.create_design_system(task)
        elif task.type == "ui_mockup":
            return await self.generate_mockup(task)
        elif task.type == "convert_to_code":
            return await self.mockup_to_code(task)

    async def generate_mockup(self, task):
        """Use Nono Banana Pro to generate UI mockup"""

        # Step 1: Create detailed prompt with Gemini
        prompt = await self.create_ui_prompt(task)

        # Step 2: Generate image with Nono Banana Pro
        image = await self.call_nono_banana_pro(
            prompt=prompt,
            thinking_mode=True,
            search_grounding=True,
            resolution="4K"
        )

        # Step 3: Save mockup
        image_path = f"designs/{task.page_name}.png"
        image.save(image_path)

        # Step 4: Extract components from mockup
        components = await self.analyze_mockup(image)

        return {
            "success": True,
            "mockup_path": image_path,
            "components": components
        }

    async def create_ui_prompt(self, task):
        """Use Gemini to craft optimal Nono Banana prompt"""

        gemini_prompt = f"""
        Create a detailed image generation prompt for Nono Banana Pro to design a {task.page_name} page.

        Page requirements:
        - Type: {task.page_type}
        - Features: {', '.join(task.features)}
        - Style: Apple-inspired, minimalist, professional
        - Brand colors: {task.brand_colors}

        The prompt should:
        1. Specify exact layout (sidebar, main area, etc.)
        2. List all UI components needed
        3. Define typography and spacing
        4. Specify shadows, effects, animations
        5. Ensure accessibility (high contrast)
        6. Target 4K resolution

        Generate the Nono Banana Pro prompt:
        """

        response = await self.gemini.generate_content_async(gemini_prompt)
        return response.text

    async def call_nono_banana_pro(self, prompt, thinking_mode, search_grounding, resolution):
        """Call Nono Banana Pro API"""

        # API endpoint (adjust based on actual API)
        url = "https://api.nono-banana-pro.com/v1/generate"

        payload = {
            "prompt": prompt,
            "thinking_mode": thinking_mode,
            "search_grounding": search_grounding,
            "resolution": resolution,
            "format": "png",
            "style": "professional"
        }

        headers = {
            "Authorization": f"Bearer {self.nono_banana_api}",
            "Content-Type": "application/json"
        }

        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()

        # Convert response to PIL Image
        image_data = response.content
        image = Image.open(io.BytesIO(image_data))

        return image

    async def analyze_mockup(self, image):
        """Use Gemini vision to extract components from mockup"""

        # Upload image to Gemini
        image_bytes = io.BytesIO()
        image.save(image_bytes, format='PNG')
        image_bytes.seek(0)

        prompt = """
        Analyze this UI mockup and extract:
        1. Layout structure (grid, flexbox)
        2. All UI components (buttons, inputs, cards, etc.)
        3. Typography hierarchy (headings, body, captions)
        4. Color palette used
        5. Spacing system (padding, margins)
        6. Shadow and border styles

        Respond in JSON format with detailed specifications for each element.
        """

        response = await self.gemini.generate_content_async([
            prompt,
            {"mime_type": "image/png", "data": image_bytes.read()}
        ])

        return json.loads(response.text)

    async def mockup_to_code(self, task):
        """Convert Nono Banana mockup to React + Tailwind code"""

        # Load mockup and analysis
        mockup_analysis = task.mockup_analysis

        prompt = f"""
        Convert this UI mockup analysis to React + TypeScript + Tailwind CSS code.

        Analysis:
        {json.dumps(mockup_analysis, indent=2)}

        Generate:
        1. React component with TypeScript types
        2. Tailwind CSS classes for styling
        3. Framer Motion animations
        4. Accessibility attributes (ARIA labels)
        5. Responsive breakpoints

        Page: {task.page_name}
        Route: {task.route}

        Return complete Next.js 14 page code.
        """

        response = await self.gemini.generate_content_async(prompt)

        # Save generated code
        code_path = f"app/{task.route}/page.tsx"
        with open(code_path, 'w') as f:
            f.write(response.text)

        return {
            "success": True,
            "code_path": code_path
        }
```

### 3. QA Agent with Playwright MCP

```python
# agents/qa_agent.py
from playwright.async_api import async_playwright
from PIL import Image
import imagehash

class QAAgent:
    def __init__(self):
        self.gemini = genai.GenerativeModel('gemini-3-pro-preview')
        self.playwright = None

    async def execute(self, task):
        """Test implementation against design mockup"""

        if task.type == "visual_test":
            return await self.visual_regression_test(task)
        elif task.type == "functional_test":
            return await self.functional_test(task)
        elif task.type == "accessibility_test":
            return await self.a11y_test(task)

    async def visual_regression_test(self, task):
        """Compare implementation with Nono Banana mockup"""

        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()

            # Navigate to page
            await page.goto(f"http://localhost:3000{task.route}")

            # Take screenshot
            screenshot = await page.screenshot(
                path=f"screenshots/{task.page_name}-actual.png",
                full_page=True
            )

            # Load Nono Banana mockup
            mockup = Image.open(f"designs/{task.page_name}.png")
            actual = Image.open(f"screenshots/{task.page_name}-actual.png")

            # Compare images
            similarity = self.calculate_similarity(mockup, actual)

            if similarity < 0.95:
                # Images don't match - generate diff
                diff = self.generate_diff_image(mockup, actual)
                diff.save(f"screenshots/{task.page_name}-diff.png")

                # Use Gemini to analyze differences
                analysis = await self.analyze_visual_differences(
                    mockup, actual, diff
                )

                await browser.close()
                return {
                    "success": False,
                    "similarity": similarity,
                    "diff_path": f"screenshots/{task.page_name}-diff.png",
                    "analysis": analysis,
                    "recommendation": "Adjust styling to match mockup"
                }

            await browser.close()
            return {
                "success": True,
                "similarity": similarity
            }

    def calculate_similarity(self, img1, img2):
        """Calculate perceptual hash similarity"""
        # Resize to same size
        img1 = img1.resize((1920, 1080))
        img2 = img2.resize((1920, 1080))

        # Calculate perceptual hashes
        hash1 = imagehash.average_hash(img1)
        hash2 = imagehash.average_hash(img2)

        # Calculate similarity (0 to 1)
        similarity = 1 - (hash1 - hash2) / 64.0
        return similarity

    async def analyze_visual_differences(self, mockup, actual, diff):
        """Use Gemini vision to identify specific differences"""

        prompt = """
        Compare these images and identify specific visual differences:
        1. Layout differences (positioning, spacing)
        2. Color differences
        3. Typography differences (font size, weight)
        4. Missing or extra elements
        5. Shadow/border differences

        For each difference, provide:
        - What's different
        - Where it's located
        - Recommended fix (CSS/Tailwind)

        Respond in JSON format.
        """

        # Send all three images to Gemini
        response = await self.gemini.generate_content_async([
            prompt,
            {"mime_type": "image/png", "data": self.image_to_bytes(mockup)},
            {"mime_type": "image/png", "data": self.image_to_bytes(actual)},
            {"mime_type": "image/png", "data": self.image_to_bytes(diff)}
        ])

        return json.loads(response.text)

    async def functional_test(self, task):
        """Test all interactions and functionality"""

        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()

            results = []

            for test_case in task.test_cases:
                try:
                    # Navigate
                    await page.goto(test_case.url)

                    # Execute test steps
                    for step in test_case.steps:
                        await self.execute_step(page, step)

                    # Verify expectations
                    for assertion in test_case.assertions:
                        await self.verify_assertion(page, assertion)

                    results.append({
                        "test": test_case.name,
                        "passed": True
                    })

                except Exception as e:
                    # Take screenshot of failure
                    await page.screenshot(
                        path=f"failures/{test_case.name}.png"
                    )

                    results.append({
                        "test": test_case.name,
                        "passed": False,
                        "error": str(e),
                        "screenshot": f"failures/{test_case.name}.png"
                    })

            await browser.close()

            all_passed = all(r["passed"] for r in results)
            return {
                "success": all_passed,
                "results": results
            }

    async def a11y_test(self, task):
        """Test accessibility with axe-core"""

        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()

            # Navigate
            await page.goto(task.url)

            # Inject axe-core
            await page.add_script_tag(
                url="https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.0/axe.min.js"
            )

            # Run accessibility scan
            results = await page.evaluate("""
                async () => {
                    return await axe.run()
                }
            """)

            await browser.close()

            violations = results.get("violations", [])

            return {
                "success": len(violations) == 0,
                "violations": violations,
                "wcag_level": "AAA" if len(violations) == 0 else "Fail"
            }
```

---

## Running the System

### Option 1: CLI Interface

```bash
# Start the orchestrator CLI
python cli.py

# Example usage
> build-saas --request "Create a project management SaaS like Linear"

# The system will:
# 1. Analyze requirements
# 2. Create plan
# 3. Generate designs with Nono Banana Pro
# 4. Implement code
# 5. Test with Playwright
# 6. Deploy
```

### Option 2: Python API

```python
# main.py
from agents.orchestrator import MasterOrchestrator

async def main():
    orchestrator = MasterOrchestrator()

    await orchestrator.build_saas(
        user_request="""
        Build a task management SaaS with:
        - Kanban boards
        - Real-time collaboration
        - AI-powered suggestions
        - Team analytics
        """
    )

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
```

### Option 3: Web Interface

```bash
# Start web UI
npm run dev:admin

# Navigate to http://localhost:3001
# Enter your SaaS requirements
# Monitor progress in real-time
```

---

## Configuration

### Agent Configuration

```yaml
# config/agents.yaml
master_orchestrator:
  model: gemini-3-pro-preview
  temperature: 0.7
  max_tokens: 8000

design_director:
  planning_model: gemini-3-pro-preview
  image_model: nono-banana-pro
  image_resolution: 4K
  thinking_mode: true
  search_grounding: true

qa_agent:
  visual_similarity_threshold: 0.95
  playwright_browser: chromium
  parallel_tests: 4
  screenshot_full_page: true

monitor_agent:
  check_interval: 5m
  error_threshold: 0.1%
  performance_threshold:
    fcp: 1.8s
    lcp: 2.5s
```

### Cost Limits

```yaml
# config/costs.yaml
gemini_3_pro:
  daily_limit: $50
  per_request_limit: $0.10
  alert_threshold: $40

nono_banana_pro:
  daily_limit: $20
  per_image_limit: $0.50
  cache_images: true
  alert_threshold: $15
```

---

## Monitoring Dashboard

```bash
# Start monitoring dashboard
npm run dashboard

# View at http://localhost:3002
```

**Dashboard Features**:
- Real-time agent status
- Task progress
- Cost tracking
- Error logs
- Performance metrics
- Screenshot gallery
- Code diff viewer

---

## Troubleshooting

### Common Issues

**1. Nono Banana Pro Rate Limits**
```python
# Solution: Implement rate limiting
from ratelimit import limits, sleep_and_retry

@sleep_and_retry
@limits(calls=10, period=60)  # 10 images per minute
async def call_nono_banana_pro(prompt):
    # ... API call
```

**2. Playwright Timeouts**
```python
# Solution: Increase timeout for slow pages
page.set_default_timeout(60000)  # 60 seconds
```

**3. Visual Similarity False Negatives**
```python
# Solution: Adjust threshold or use regions
similarity = calculate_similarity(mockup, actual)
if similarity < 0.95:
    # Compare specific regions instead of full page
    header_similarity = compare_region(mockup, actual, "header")
    main_similarity = compare_region(mockup, actual, "main")
```

---

## Next Steps

1. **Read**: `GEMINI_AGENTIC_SAAS_ARCHITECTURE.md` for full architecture
2. **Setup**: Follow installation steps above
3. **Configure**: Set API keys and preferences
4. **Test**: Run example SaaS build
5. **Customize**: Adjust agents for your specific needs
6. **Deploy**: Use Vercel + Supabase for production

---

## Support

- **Documentation**: `docs/`
- **Examples**: `examples/`
- **Issues**: GitHub Issues
- **Discord**: [Join Community]

Built with Gemini 3 Pro, Nono Banana Pro, and Playwright MCP.
