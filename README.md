# PhishPhind: AI Email Scanner

**Disclaimer:** This project is a proof of concept demonstrating a UI for using LLMs to perform multi-step analysis of emails for malicious content. It is not intended to be effective or reliable in its current state and should not be used for real-world security analysis.

PhishPhind: AI Email Scanner is a **static web application** designed to streamline the process of analyzing email content for potential phishing attempts and other malicious threats. It leverages LLMs to automate various analysis steps, providing insights into sender legitimacy, content suspiciousness, and potential risks associated with links and attachments.

## What It Does

-   Analyzes email content for malicious indicators.
-   Uses configurable steps to extract data and assess risk.
-   Integrates with OpenAI to perform in-depth analysis.
-   Provides a user-friendly interface for uploading and analyzing email messages.
-   Allows customization of analysis workflows and models.
-   Exports analysis results to PDF for easy sharing and documentation.

## Default Analysis Steps

PhishPhind will perform a default set of analysis steps sequentially: for each step, it sends a prompt to the LLM and waits for a response before proceeding to the next step. This allows each step to build upon the findings of the previous ones. The default steps are:

1.  **Data Extraction:** Extracts key information from the email, such as sender details, recipient details, subject line, message body, attachments, and links.
2.  **Sender Analysis:** Analyzes the sender's information to determine its legitimacy, checking for domain anomalies, free email services, and other red flags.
3.  **Content Analysis:** Examines the email content for suspicious characteristics, such as urgent or threatening phrases, psychological pressure tactics, and grammatical errors.
4.  **Links and Attachments Analysis:** Analyzes the links and attachments for potential risks, checking for URL anomalies, domain legitimacy, and risky file types.
5.  **Contextual Analysis:** Assesses the overall context of the email, considering whether it's expected, if there's prior communication history, and any inconsistencies between the display name and email address.
6.  **Compilation of Findings:** Aggregates all identified red flags and suspicious indicators from the previous steps, organizing them by category (Sender, Content, Links and Attachments, Context).
7.  **Recommendations:** Provides recommendations and next steps based on the consolidated findings, suggesting appropriate actions for the cyber analyst.

## Understanding the Analysis Steps (Customization)

The core of the analysis process is driven by the steps defined in the `config/steps.json` file. These steps can be overridden and customized via the settings modal within the web application. Each step represents a distinct stage in the analysis workflow, allowing for a modular and customizable approach. Here's a breakdown of the key components within each step:


-   `name`: A unique identifier for the step (e.g., `"data_extraction"`). This is used internally to reference the step's output in subsequent steps.
-   `menuName`: The name displayed in the user interface for this step (e.g., `"Extract Data"`).
-   `stepPrompt`: This is the main instruction given to the LLM for this step. It includes:
    -   Instructions on what information to extract or analyze.
    -   Placeholders (e.g., `{message_content}`, `{data_extraction_output}`) that are dynamically replaced with the email content or the output from previous steps. This allows you to chain the analysis, feeding the results of one step into the next.
-   `llmInstructions`: Specifies how the LLM should format its response. This is crucial for consistent output and reliable parsing of the results. It typically includes:
    -   Instructions to enclose the response within specific tags (e.g., `[Response]`, `[Response Summary]`).
    -   A structured format for the LLM to follow when presenting its findings.

The application iterates through these steps sequentially, feeding the output of each step into the next, ultimately compiling a comprehensive analysis of the email.

## How to Use

1.  **Load Message** – Upload an email file or paste the message content into the text area.
2.  **Start Analysis** – Click the "Start Analysis" button to begin the automated analysis process.
3.  **View Results** – Review the analysis results in the tabbed interface, which includes summaries and detailed findings for each step.
4.  **Export to PDF** – Export the analysis results to a PDF file for easy sharing and documentation.
5.  **Configure Settings** – Customize the analysis process by configuring the OpenAI API key, selecting models, and adjusting workflow steps in the settings modal.

## Running PhishPhind: AI Email Scanner

As a **static web application**, no installation is required; simply open the `index.html` file in a web browser.

## Configuration

The application relies on the following configuration files:

-   `config/models.json`: Defines the available LLM models for analysis.
-   `config/steps.json`: Configures the workflow steps for analyzing email content.

These files can be customized via the settings modal within the application.

## License

This code is provided as-is, with no guarantees or restrictions. Use it however you like with no restriction.

## Author

*   **MitchBoss** - [GitHub Profile](https://github.com/MitchBoss)
