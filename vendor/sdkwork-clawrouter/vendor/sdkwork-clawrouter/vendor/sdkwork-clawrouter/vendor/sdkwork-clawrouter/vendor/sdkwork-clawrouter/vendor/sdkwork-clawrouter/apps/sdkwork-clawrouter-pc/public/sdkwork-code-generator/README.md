# SDKWork Code Generator

A modern multi-language code generator based on OpenAPI 3.x standards, supporting SDK and HTTP request code generation for multiple programming languages.

## ✨ Features

- **Multi-language Support**: Supports 12+ programming languages for code generation
- **OpenAPI 3.x Standard**: Fully compliant with the latest OpenAPI specification
- **HTTP Request Generation**: Automatically generates complete HTTP request code
- **SDK Generation**: Generates complete SDK project structure
- **Type Safety**: Complete TypeScript type definitions
- **Extensible Architecture**: Modular design, easy to extend with new language support

## 🚀 Supported Languages

| Language | HTTP Library Support | SDK Generation | MCP Generation | Code Generation |
|----------|---------------------|----------------|----------------|-----------------|
| JavaScript | ✅ Axios, Fetch, Got, Superagent | ✅ | 🔄 | ✅ |
| TypeScript | ✅ Axios, Fetch, Got, Superagent | ✅ | 🔄 | ✅ |
| Python | ✅ Requests, aiohttp, httpx | ✅ | 🔄 | ✅ |
| Java | ✅ OkHttp, Retrofit, Apache HttpClient, Unirest | ✅ | 🔄 | ✅ |
| Go | ✅ net/http, fasthttp, resty | ✅ | 🔄 | ✅ |
| C# | ✅ HttpClient, RestSharp, Refit | ✅ | 🔄 | ✅ |
| PHP | ✅ Guzzle, cURL | ✅ | 🔄 | ✅ |
| Swift | ✅ Alamofire, URLSession | ✅ | 🔄 | ✅ |
| Dart | ✅ Dio, http | ✅ | 🔄 | ✅ |
| Kotlin | ✅ OkHttp, Retrofit | ✅ | 🔄 | ✅ |
| Ruby | ✅ Faraday, HTTParty | ✅ | 🔄 | ✅ |
| C++ | ✅ Boost.Beast, cpp-httplib, cpprest | ✅ | 🔄 | ✅ |

## 📦 Installation

```bash
# Clone the project
git clone https://github.com/nodesource/sdkwork-code-generator.git
cd sdkwork-code-generator

# Install dependencies
npm install

# Build the project
npm run build
```

## 🎯 Quick Start

### Basic Usage

First install the package:

```bash
npm install sdkwork-code-generator
```

Then use in your code:

```typescript
import { OpenAPIParser, CodeGeneratorFactory } from 'sdkwork-code-generator';

// Create parser instance
const parser = new OpenAPIParser();

// Method 1: Parse local file (auto-detect format)
const specFromFile = await parser.parseFile('path/to/openapi.yaml'); // Supports .yaml, .yml, .json

// Method 2: Parse from URL
const specFromUrl = await parser.parseByUrl('https://api.example.com/openapi.json');

// Method 3: Parse string content directly
const yamlContent = `
openapi: 3.0.0
info:
  title: Sample API
  version: 1.0.0
`;
const specFromString = parser.parse(yamlContent);

// Use factory class to generate code
const generator = CodeGeneratorFactory.getGenerator('typescript', 'axios');
const result = generator.generateCode(
  '/api/users/{userId}',
  'GET',
  'https://api.example.com',
  specFromFile.paths['/api/users/{userId}'].get,
  [], // cookies
  [], // headers
  [], // queryParams
  null, // requestBody
  {
    outputDir: './generated',
    baseUrl: 'https://api.example.com'
  }
);

console.log('Generated code:', result);
```

### Code Generation Support

This project provides multiple code generation capabilities:

#### 1. OpenAPI Operation Access Code Generation ✅
Using the `RequestCodeGenerator` interface, supports multiple language implementations to generate specific HTTP request code.

```typescript
import { RequestCodeGenerator } from 'sdkwork-code-generator';

// Get code generator for specific language
const codeGenerator = CodeGeneratorFactory.getGenerator('typescript', 'axios');

// Generate request code for single operation
const code = codeGenerator.generateCode(
  '/api/users/{userId}',
  'GET',
  'https://api.example.com',
  operation,
  [], // cookies
  [], // headers
  [], // queryParams
  null, // requestBody
  {
    outputDir: './generated',
    baseUrl: 'https://api.example.com'
  }
);
```

#### 2. Multi-language SDK Generation 🔄 In Development...
Generate complete SDK project structure based on OpenAPI standards.

#### 3. MCP Code Generation 🔄 In Development...
Generate Model Context Protocol related code through OpenAPI standards.

#### 4. Prompt-driven Code Generation 🔄 In Development...
Generate code through input prompts, supporting MCP calls.

#### 5. Prompt-driven Project Creation 🔄 In Development...
Create complete code projects through input prompts, supporting MCP calls.

#### 6. Prompt-driven Application Creation 🔄 In Development...
Create complete applications through input prompts, supporting MCP calls.

### Check Supported Languages and Libraries

```typescript
// Get list of supported languages
const supportedLanguages = CodeGeneratorFactory.getSupportedLanguages();
console.log('Supported languages:', supportedLanguages);

// Check if specific combination is supported
const isSupported = CodeGeneratorFactory.isSupported('python', 'requests');
console.log('Python requests supported:', isSupported);

// Get all languages list
const languages = CodeGeneratorFactory.getLanguages();
console.log('Languages:', languages);

// Get libraries supported by specific language
const pythonLibs = CodeGeneratorFactory.getLibraries('python');
console.log('Python libraries:', pythonLibs);

// Get default library
const defaultPythonLib = CodeGeneratorFactory.getDefaultLibrary('python');
console.log('Default Python library:', defaultPythonLib);
```

### Command Line Usage

```bash
# Generate TypeScript Axios code
npm run generate -- --input openapi.yaml --language typescript --library axios --output ./generated

# Generate Python Requests code
npm run generate -- --input openapi.yaml --language python --library requests --output ./generated
```

## 📁 Project Structure

```
sdkwork-code-generator/
├── src/                          # Source code
│   ├── openapi/                  # OpenAPI functionality modules
│   │   ├── parser/               # Parsers
│   │   └── generator/           # Code generators
│   │       └── languages/        # Multi-language implementations
│   ├── mcp/                      # MCP protocol support
│   ├── sdk/                      # SDK generation
│   ├── types/                    # Type definitions
│   └── utils/                    # Utility functions
├── templates/                    # Code templates
├── dist/                         # Build output
└── test/                         # Test files
```

## 🔧 Development

### Development Environment Setup

```bash
# Install dependencies
npm install

# Development mode (watch file changes)
npm run dev

# Run tests
npm test

# Build project
npm run build

# Code linting
npm run lint

# Code formatting
npm run format
```

### Adding New Language Support

1. Create language directory in `src/openapi/generator/languages/`
2. Implement `BaseRequestCodeGenerator` abstract class
3. Register new language in language registry
4. Add corresponding test cases

## 🧪 Testing

The project includes complete unit tests and integration tests:

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run specific tests
npm test -- --grep "javascript"
```

## 📊 Code Quality

- **TypeScript**: Strict type checking
- **ESLint**: Code style checking
- **Prettier**: Automatic code formatting
- **Jest**: Unit testing framework
- **Husky**: Git hooks management

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the project
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related Links

- [OpenAPI Specification](https://github.com/OAI/OpenAPI-Specification)
- [Model Context Protocol](https://github.com/modelcontextprotocol)
- [Project Issues](https://github.com/nodesource/sdkwork-code-generator/issues)

## 📞 Support

For questions or suggestions, please contact:

- Create an [Issue](https://github.com/nodesource/sdkwork-code-generator/issues)
- Send email to: support@nodesource.com

---

⭐ If this project helps you, please give it a Star!