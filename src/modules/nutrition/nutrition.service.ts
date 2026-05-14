import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { ChatGroq } from '@langchain/groq';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { HttpResponse } from 'mvc-common-toolkit';
import { Repository } from 'typeorm';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { ENV_KEY } from '@shared/constants';
import { generateSuccessResult } from '@shared/helpers/operation-result.helper';
import { BaseCRUDService } from '@shared/services/base-crud.service';

import { Nutritions } from './nutrition.entity';

// Define the state for our RAG graph
const GraphState = Annotation.Root({
  disease: Annotation<string>(),
  query: Annotation<string>(),
  context: Annotation<string>(),
  documents: Annotation<any[]>(),
  answer: Annotation<any>(),
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
    const geminiApiKey = this.configService.get<string>(ENV_KEY.GEMINI_API_KEY);
    const geminiModel = this.configService.get<string>(
      ENV_KEY.GEMINI_EMBEDDING_MODEL_NAME,
    );
    const groqApiKey = this.configService.get<string>(ENV_KEY.GROQ_API_KEY);
    const groqModel = this.configService.get<string>(ENV_KEY.GROQ_MODEL_NAME);

    this.embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: geminiApiKey,
      modelName: geminiModel,
    });

    this.chatModel = new ChatGroq({
      apiKey: groqApiKey,
      model: groqModel,
      temperature: 0.4,
      maxTokens: 4096,
      maxRetries: 3,
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
      `SELECT id, content, source, chunk_metadata as metadata, (embedding::vector <=> $1::vector) as distance 
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

Yêu cầu BẮT BUỘC:
1. Trả lời bằng tiếng Việt, giọng điệu thân thiện, dễ hiểu cho nông dân.
2. Dựa trên thông tin tài liệu, đưa ra các bước xử lý cụ thể (phân bón, thuốc bảo vệ thực vật sinh học/hóa học).
3. KHÔNG trả lời dưới dạng văn bản tự do hay markdown. CHỈ trả về KẾT QUẢ DUY NHẤT LÀ MỘT CHUỖI JSON ĐÚNG CHUẨN (không bọc trong markdown code block \`\`\`json) theo đúng định dạng sau:
{
  "summary": "Lời chào thân thiện và tóm tắt ngắn gọn tình trạng bệnh / nguyên nhân",
  "disease_name": "Tên bệnh bằng tiếng Việt chuẩn",
  "severity_assessment": "Đánh giá mức độ nghiêm trọng: Nhẹ / Trung bình / Nghiêm trọng / Cấp bách",
  "immediate_actions": ["Hành động khẩn cấp 1 cần làm ngay", "Hành động khẩn cấp 2 cần làm ngay"],
  "treatment_protocol": {
    "biological": "Biện pháp sinh học / canh tác / điều chỉnh nước",
    "chemical": "Thuốc bảo vệ thực vật / biện pháp hóa học (ghi rõ hoạt chất nếu có)",
    "cultural": "Biện pháp canh tác làm đất, vệ sinh đồng ruộng"
  },
  "npk_adjustment": "Hướng dẫn điều chỉnh phân bón NPK chi tiết",
  "prevention_measures": ["Biện pháp phòng ngừa lâu dài 1", "Biện pháp phòng ngừa lâu dài 2"]
}
4. Lời khuyên phải NGẮN GỌN, SÚC TÍCH, đi thẳng vào vấn đề. Tuyệt đối KHÔNG lặp lại các từ ngữ (tránh lỗi lặp từ). Đảm bảo JSON sinh ra hoàn chỉnh và đúng cấu trúc.`;

    const response = await this.chatModel.invoke(prompt);

    let parsedAnswer: any = {};
    try {
      let rawContent = response.content.trim();
      const firstCurly = rawContent.indexOf('{');
      const lastCurly = rawContent.lastIndexOf('}');
      if (firstCurly !== -1 && lastCurly !== -1 && lastCurly > firstCurly) {
        rawContent = rawContent.substring(firstCurly, lastCurly + 1);
      }
      parsedAnswer = JSON.parse(rawContent);
    } catch (error) {
      this.logger.warn(
        `Failed to parse JSON from LLM response: ${error.message}`,
      );
      parsedAnswer = {
        summary: response.content,
        disease_name: state.disease,
        severity_assessment: 'Trung bình',
        immediate_actions: [],
        treatment_protocol: { biological: '', chemical: '', cultural: '' },
        npk_adjustment: '',
        prevention_measures: [],
      };
    }

    return { answer: parsedAnswer };
  }

  /**
   * RAG Advisory generating structured JSON.
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
