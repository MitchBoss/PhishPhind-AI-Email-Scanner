# PhishPhind: A Framework for Sequential LLM Prompting

PhishPhind was created as a proof of concept of an easy-to-use interface for multi-step LLM prompting, using specific outputs from previous prompts in an intuitive user interface. While the specific implementation focuses on phishing email detection, the core architecture serves as a reusable foundation for any sequential LLM prompting workflow.

**Demo:** [mailscan.xpulse.dev](https://mailscan.xpulse.dev)

**Disclaimer:** The phishing detection implementation is a demonstration and I make no claims of its reliability or the accuracy of results in its current state. It should not be relied upon for real-world security analysis.

PhishPhind is a **static web application** that demonstrates how large language models can be chained together in a step-by-step workflow, with each step building upon the results of previous steps. The current implementation applies this architecture to email analysis, but the underlying framework can be adapted for various use cases requiring sequential LLM processing.

## Core Architecture

PhishPhind's key innovation is its flexible, modular architecture that enables:

-   Step-by-step LLM prompting with dependency tracking
-   Variable passing between steps (referencing outputs from earlier steps)
-   Customizable prompts and instructions for each step from within the UI
-   Structured output formatting for consistent results
-   Intuitive UI for managing the workflow
-   Local storage for configuration persistence
-   Export capabilities for sharing results

## Current Implementation: Email Analysis

The current implementation demonstrates the architecture through email phishing analysis:

-   Analyzes email content for malicious indicators
-   Uses configurable steps to extract data and assess risk
-   Integrates with OpenAI to perform in-depth analysis
-   Provides a user-friendly interface for uploading and analyzing email messages
-   Allows customization of analysis workflows and models
-   Exports analysis results to PDF for easy sharing and documentation

## Default Analysis Steps

The example implementation performs these sequential analysis steps, with each step building upon the findings of previous ones:

1.  **Email Parsing:** Extracts key information from the email, such as sender details, recipient details, subject line, message body, attachments, and links.
2.  **Sender & Header Analysis:** Analyzes the sender's information to determine its legitimacy, checking for domain anomalies, free email services, SPF/DKIM verification results, and other red flags.
3.  **Link & Attachment Analysis:** Analyzes the links and attachments for potential risks, checking for URL anomalies, domain legitimacy, and risky file types.
4.  **Content Analysis:** Examines the email content for suspicious characteristics, such as urgent or threatening phrases, psychological pressure tactics, and grammatical errors.
5.  **Final Risk Assessment & Recommendations:** Aggregates all identified red flags and suspicious indicators from the previous steps, organizing them by category and providing an overall risk rating and actionable recommendations.

## Understanding the Step System (Customization)

The core of PhishPhind's architecture is its step system, which can be customized for different use cases. Each step has these key components:

-   `name`: A unique identifier for the step (e.g., `"data_extraction"`). This is used internally to reference the step's output in subsequent steps.
-   `menuName`: The name displayed in the user interface for this step (e.g., `"Extract Data"`).
-   `stepPrompt`: This is the main instruction given to the LLM for this step. It includes:
    -   Instructions on what information to extract or analyze.
    -   Placeholders (e.g., `{message_content}`, `{data_extraction_output}`) that are dynamically replaced with the input content or the output from previous steps. This allows you to chain the analysis, feeding the results of one step into the next.
-   `llmInstructions`: Specifies how the LLM should format its response. This is crucial for consistent output and reliable parsing of the results. It typically includes:
    -   Instructions to enclose the detailed response within `[Response]` tags. This content is used for the main tabbed output in the interface.
    -   Instructions to provide a brief summary within `[Response Summary]` tags. This content is displayed separately as a quick overview of the step's results.
    -   A structured format for the LLM to follow when presenting its findings.

The application iterates through these steps sequentially, feeding the output of each step into the next, ultimately compiling a comprehensive analysis based on all previous steps.

## How to Use

1.  **Configure API Settings** – Click the settings icon and enter your OpenAI API key and select the desired model to use for analysis.
2.  **Load Message** – Upload an email file or paste the message content into the text area.
3.  **Start Analysis** – Click the "Start Analysis" button to begin the automated analysis process.
4.  **View Results** – Review the analysis results in the tabbed interface, which includes summaries and detailed findings for each step.
5.  **Export to PDF** – Export the analysis results to a PDF file for easy sharing and documentation.
6.  **Configure Settings** – Customize the analysis process by configuring the OpenAI API key, selecting models, and adjusting workflow steps in the settings modal.

## Running PhishPhind

Although PhishPhind is a static web application, it must be served from a web server to function properly. Due to CORS (Cross-Origin Resource Sharing) restrictions, opening the `index.html` file directly in a browser will cause API requests to fail.

You can run PhishPhind using one of these methods:

1. **Local Web Server**: Use a simple HTTP server such as:
   - Python's built-in server: `python -m http.server`
   
2. **Deployment**: Host on any static file hosting service like:
   - GitHub Pages
   - Netlify
   - Vercel
   - AWS S3 with static website hosting

Once your server is running, access the application through the URL provided by your chosen method (e.g., `http://localhost:8000` or your deployment URL).

## Configuration

The application relies on the following configuration files:

-   `config/models.json`: Defines the available LLM models for analysis.
-   `config/steps.json`: Configures the workflow steps for processing.

These files can be customized via the settings modal within the application.

## Adapting for Other Use Cases

While the current implementation focuses on email analysis, the underlying architecture can be adapted for various sequential LLM workflows such as:

- Document analysis and summarization
- Multi-step content generation
- Data extraction and transformation pipelines
- Educational tutorials with progressive steps
- Decision-making frameworks
- Research assistance workflows

To adapt for other use cases, you would primarily modify the steps in the `/steps/` directory and adjust the UI labels accordingly.

## Component System

PhishPhind is built using a modular component-based architecture, making it highly maintainable and extensible. The component system includes:

### Core Components

- **Card** - Flexible content containers with header, body, and footer sections
- **Modal** - Dialog windows for displaying content or collecting user input
- **Button** - Interactive elements with various styles and states
- **Form Elements** - Text inputs, checkboxes, radio buttons, selects, etc.
- **Tabs** - Tabbed interface for organizing and switching between content sections
- **Table** - Data tables with sortable columns and row actions
- **Navigation** - Navbar and sidebar components for application navigation

### Component Architecture

The component system follows these design principles:

1. **BEM Methodology** - Block Element Modifier approach for CSS class naming
2. **Modular CSS** - Component-specific CSS files loaded only when needed
3. **Template-based Rendering** - HTML templates with conditional content
4. **Factory Functions** - JavaScript functions that create and configure components
5. **Event System** - Custom events for component interaction and state changes

### Using Components

Components can be easily created using the `ComponentLoader` API:

```javascript
// Create a card component
const card = await ComponentLoader.createCard({
  title: 'Card Title',
  content: '<p>Card content goes here</p>',
  variant: 'bordered'
});

// Create a modal
await ComponentLoader.showModal({
  title: 'Modal Title',
  content: '<p>Modal content</p>',
  buttons: [
    { text: 'Close', action: 'close', variant: 'primary' }
  ]
});

// Create a navbar
const navbar = await ComponentLoader.createNavbar({
  brand: { title: 'PhishPhind', url: '#' },
  items: [
    { text: 'Dashboard', url: '#dashboard', active: true },
    { text: 'Analysis', url: '#analysis' }
  ]
});
```

## Project Structure

The application is organized as follows:

```
PhishPhind-AI-Email-Scanner/
│
├── css/                    # CSS styles
│   ├── base.css            # Base styles
│   ├── layout.css          # Layout styles
│   ├── main.css            # Main stylesheet
│   ├── variables.css       # CSS variables
│   └── components/         # Component-specific styles
│       ├── button.css      # Button styles
│       ├── card.css        # Card styles
│       ├── modal.css       # Modal styles
│       ├── form.css        # Form elements styles
│       ├── tabs.css        # Tabs styles
│       ├── table.css       # Table styles
│       └── navigation.css  # Navigation styles
│
├── js/                     # JavaScript files
│   ├── main.js             # Main application logic
│   ├── componentLoader.js  # Component system
│   ├── util.js             # Utility functions
│   └── services/           # Service modules
│
├── components/             # HTML templates for components
│   ├── card.html           # Card component template
│   ├── modal.html          # Modal component template
│   ├── form/               # Form element templates
│   ├── tabs/               # Tabs component templates
│   ├── table/              # Table component templates
│   └── navigation/         # Navigation component templates
│
├── modules/                # Application modules
│   ├── analysis/           # Analysis module
│   ├── history/            # History module
│   ├── settings/           # Settings module
│   └── about/              # About module
│
├── config/                 # Configuration files
│   ├── models.json         # LLM models configuration
│   └── steps.json          # Analysis steps configuration
│
├── steps/                  # Default analysis steps 
│   ├── 01_email_parsing.txt           # Email parsing step
│   ├── 02_sender_header_analysis.txt  # Sender analysis step
│   ├── 03_link_attachment_analysis.txt # Link analysis step
│   ├── 04_content_analysis.txt        # Content analysis step
│   └── 05_final_assessment.txt        # Final assessment step
│
└── index.html              # Main HTML file
```

## License

This code is provided as-is, with no guarantees or restrictions. Use it however you like with no restriction.

## Author

*   **MitchBoss** - [GitHub Profile](https://github.com/MitchBoss)
