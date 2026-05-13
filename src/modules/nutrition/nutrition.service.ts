import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { ChatGroq } from '@langchain/groq';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { HttpResponse } from 'mvc-common-toolkit';
import { Repository } from 'typeorm';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { CONFIG_KEY } from '@shared/constants';
import { generateSuccessResult } from '@shared/helpers/operation-result.helper';
import { BaseCRUDService } from '@shared/services/base-crud.service';

import { Nutritions } from './nutrition.entity';

// Define the state for our RAG graph
const GraphState = Annotation.Root({
  disease: Annotation<string>(),
  query: Annotation<string>(),
  context: Annotation<string>(),
  documents: Annotation<any[]>(),
  answer: Annotation<string>(),
});

@Injectable()
export class NutritionService
  extends BaseCRUDService<Nutritions>
  implements OnModuleInit
{
  private readonly logger = new Logger(NutritionService.name);
  private embeddings: GoogleGenerativeAIEmbeddings;
  private chatModel: any;
  private graph: any;

  constructor(
    @InjectRepository(Nutritions)
    docRepo: Repository<Nutritions>,
    private readonly configService: ConfigService,
  ) {
    super(docRepo);
  }

  onModuleInit() {
    const geminiConfig = this.configService.get(CONFIG_KEY.GEMINI);
    const groqConfig = this.configService.get(CONFIG_KEY.GROQ);

    this.embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: geminiConfig.apiKey,
      modelName: geminiConfig.embeddingModelName,
    });

    this.chatModel = new ChatGroq({
      apiKey: groqConfig.apiKey,
      model: groqConfig.modelName,
      temperature: 0.2,
    });

    this.setupGraph();
  }

  private setupGraph() {
    const workflow = new StateGraph(GraphState)
      .addNode('retrieve', this.retrieve.bind(this))
      .addNode('generate', this.generate.bind(this))
      .addEdge(START, 'retrieve')
      .addEdge('retrieve', 'generate')
      .addEdge('generate', END);

    this.graph = workflow.compile();
  }

  private async retrieve(state: typeof GraphState.State) {
    const query = `${state.disease} ${state.context || ''}`;
    const embedding = await this.embeddings.embedQuery(query);

    // Similarity search using pgvector via raw SQL
    // We use cosine distance <=> operator
    const docs = await this.model.query(
      `SELECT id, content, source, chunk_metadata as metadata, (embedding <=> $1::vector) as distance 
       FROM nutritions 
       ORDER BY distance ASC 
       LIMIT 3`,
      [`[${embedding.join(',')}]`],
    );

    return { documents: docs };
  }

  private async generate(state: typeof GraphState.State) {
    const contextStr = state.documents
      .map((doc) => `[Source: ${doc.source}]\n${doc.content}`)
      .join('\n\n');

    const prompt = `Bạn là một chuyên gia nông nghiệp của hệ thống LúaKhỏe. 
Dưới đây là thông tin về bệnh/vấn đề cây trồng: ${state.disease}
Ngữ cảnh bổ sung: ${state.query}

Sử dụng tài liệu chuyên môn sau đây để đưa ra lời khuyên chi tiết cho người nông dân:
${contextStr}

Yêu cầu:
1. Trả lời bằng tiếng Việt, giọng điệu thân thiện, dễ hiểu cho nông dân.
2. Đưa ra các bước xử lý cụ thể (phân bón, thuốc bảo vệ thực vật nếu có trong tài liệu).
3. Nếu không có thông tin trong tài liệu, hãy dựa trên kiến thức chuyên môn về lúa gạo của bạn để hỗ trợ nhưng phải lưu ý nông dân nên tham khảo cán bộ địa phương.

Câu trả lời:`;

    const response = await this.chatModel.invoke(prompt);
    return { answer: response.content };
  }

  /**
   * Placeholder for RAG Advisory.
   * This will eventually use langchain.js / langgraph.js to:
   * 1. Embed the query.
   * 2. Perform similarity search in pgvector.
   * 3. Call LLM (Gemini) for answer generation.
   */
  async getAdvisory(
    diseaseName: string,
    context?: string,
  ): Promise<HttpResponse<any>> {
    this.logger.log(`Generating advisory for ${diseaseName}`);

    const result = await this.graph.invoke({
      disease: diseaseName,
      query: context || `Làm thế nào để xử lý bệnh ${diseaseName}?`,
      context: context,
    });

    return generateSuccessResult({
      advisory: result.answer,
      sources: result.documents.map((d) => ({
        source: d.source,
        id: d.id,
      })),
      disease: diseaseName,
    });
  }

  async seedKnowledge(
    documents: { content: string; source?: string; metadata?: any }[],
  ): Promise<HttpResponse<any>> {
    this.logger.log(`Seeding ${documents.length} knowledge documents...`);

    for (const doc of documents) {
      await this.uploadDocument(doc.content, doc.source, doc.metadata || {});
    }

    return generateSuccessResult({ count: documents.length });
  }

  async uploadDocument(content: string, source?: string, metadata?: any) {
    const embedding = await this.embeddings.embedQuery(content);

    return this.create({
      content,
      source,
      chunkMetadata: metadata,
      embedding,
    });
  }
}
