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
  diseases: Annotation<{ name: string; confidence: number; affectedAreaRatio: number }[]>(),
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
    const documents: any[] = [];
    const diseaseList = state.diseases || (state.disease ? [{ name: state.disease, confidence: 1.0, affectedAreaRatio: 0.0 }] : []);

    for (const d of diseaseList) {
      const query = `${d.name} ${state.context || ''}`;
      try {
        const embedding = await this.embeddings.embedQuery(query);
        const docs = await this.model.query(
          `SELECT id, content, source, chunk_metadata as metadata, (embedding::vector <=> $1::vector) as distance 
           FROM nutritions 
           ORDER BY distance ASC 
           LIMIT 3`,
          [`[${embedding.join(',')}]`],
        );
        documents.push(...docs);
      } catch (err) {
        this.logger.error(`Embedding or retrieval failed for ${d.name}: ${err.message}`);
      }
    }

    // Deduplicate documents by ID to avoid sending duplicate context to LLM
    const uniqueDocs = Array.from(new Map(documents.map((doc) => [doc.id, doc])).values());

    return { documents: uniqueDocs };
  }

  private async generate(state: typeof GraphState.State) {
    const contextStr = state.documents
      .map((doc) => `[Source: ${doc.source}]\n${doc.content}`)
      .join('\n\n');

    const diseaseList = state.diseases || (state.disease ? [{ name: state.disease, confidence: 1.0, affectedAreaRatio: 0.0 }] : []);
    const diseasesStr = diseaseList
      .map((d) => `- Bệnh: ${d.name} (Độ tin cậy: ${(d.confidence * 100).toFixed(1)}%, Tỷ lệ diện tích nhiễm bệnh: ${(d.affectedAreaRatio * 100).toFixed(1)}%)`)
      .join('\n');

    const prompt = `Bạn là một chuyên gia nông nghiệp của hệ thống LúaKhỏe. 
Dưới đây là thông tin về các bệnh/vấn đề cây trồng chẩn đoán được trên cùng mẫu lá:
${diseasesStr}

Ngữ cảnh thực địa bổ sung: ${state.query}

Sử dụng tài liệu chuyên môn sau đây để đưa ra lời khuyên chi tiết cho người nông dân:
${contextStr}

Yêu cầu BẮT BUỘC:
1. Trả lời bằng tiếng Việt, giọng điệu thân thiện, dễ hiểu cho nông dân.
2. Phân tích phác đồ điều trị và trình tự ưu tiên xử lý:
   - Sắp xếp thứ tự ưu tiên điều trị dựa trên tỷ lệ diện tích bị nhiễm bệnh (affected_area_ratio) từ cao xuống thấp. Bệnh nào nặng hơn hoặc có nguy cơ cao (>35% diện tích) cần được đưa lên đầu phác đồ.
   - LƯU Ý ĐẶC BIỆT (AN TOÀN HÓA HỌC): Khi đề xuất thuốc bảo vệ thực vật hóa học (chemical), nếu phát hiện hai phác đồ điều trị của các bệnh có chứa hoạt chất xung đột hoặc kỵ nhau (có thể gây ngộ độc thuốc, cháy lá hoặc hỏng lúa khi phun cùng lúc), bạn PHẢI ưu tiên tính an toàn hóa học lên hàng đầu.
   - TUYỆT ĐỐI CẢNH BÁO không tự ý phối trộn các loại thuốc gốc Đồng (Copper) với thuốc sinh học hoặc các hoạt chất kỵ nhau. Phải đề xuất ưu tiên điều trị loại bệnh có tỷ lệ diện tích lây nhiễm (affected_area_ratio) lớn hơn. Đưa ra cảnh báo rõ ràng và hướng dẫn nông dân phun cách nhau bao nhiêu ngày, tuyệt đối không trộn chung các hoạt chất kỵ nhau.
3. QUY ĐỊNH ĐỊNH DẠNG JSON (BẮT BUỘC VÀ KHÔNG ĐƯỢC PHÁ VỠ):
   - KHÔNG trả lời dưới dạng văn bản tự do hay markdown toàn cục.
   - CHỈ trả về KẾT QUẢ DUY NHẤT LÀ MỘT CHUỖI JSON ĐÚNG CHUẨN (không bọc trong markdown code block \`\`\`json).
   - Trong trường "treatment_protocol":
     * Trường "biological" và "chemical" PHẢI LÀ MẢNG CÁC ĐỐI TƯỢNG (Array of Objects), mỗi đối tượng đại diện cho một bệnh hoặc khuyến nghị phối hợp với cấu trúc chính xác: {"disease_name": "Tên bệnh", "steps": ["Khuyến nghị 1", "Khuyến nghị 2"]}. TUYỆT ĐỐI KHÔNG ĐƯỢC để giá trị của "biological" hay "chemical" là chuỗi văn bản (string) hay mảng chứa các chuỗi thuần túy.
     * TUYỆT ĐỐI KHÔNG sử dụng các ký tự định dạng markdown như "###", "**" hay "-" ở đầu chuỗi trong các trường disease_name và các phần tử trong steps. Các tên bệnh và các hành động phải là văn bản sạch (clean text).
     * Trường "cultural" PHẢI LÀ MẢNG CÁC CHUỖI VĂN BẢN (Array of Strings) đại diện cho các biện pháp canh tác (ví dụ: ["Biện pháp 1", "Biện pháp 2"]). TUYỆT ĐỐI KHÔNG để giá trị của "cultural" là chuỗi văn bản (string) chứa các ký tự xuống dòng hay gạch đầu dòng.
4. Cấu trúc JSON mẫu bạn phải trả về:
{
  "summary": "Lời chào thân thiện và tóm tắt ngắn gọn tình trạng các bệnh được phát hiện, thứ tự ưu tiên xử lý cùng lời khuyên an toàn hóa học cốt lõi.",
  "disease_name": "Tên bệnh chính hoặc tên các bệnh kết hợp (Ví dụ: Bệnh Đạo ôn & Đốm nâu)",
  "severity_assessment": "Đánh giá mức độ nghiêm trọng tổng thể: Nhẹ / Trung bình / Nghiêm trọng / Cấp bách",
  "immediate_actions": ["Hành động khẩn cấp 1 cần làm ngay", "Hành động khẩn cấp 2 cần làm ngay"],
  "treatment_protocol": {
    "biological": [
      {
        "disease_name": "Bệnh Đốm Nâu",
        "steps": [
          "Bón Bacillus subtilis (hoặc sản phẩm có chứa B. subtilis) 2 tấn/ha, phun 2 lần cách nhau 7 ngày.",
          "Sử dụng Trichoderma harzianum 1 tấn/ha, phun giai đoạn đầu lứa."
        ]
      },
      {
        "disease_name": "Bệnh Đạo Ôn",
        "steps": [
          "Phun sản phẩm chứa Pseudomonas fluorescens 1 tấn/ha, 2 lần cách 10 ngày.",
          "Áp dụng biocontrol Gliocladium catenulatum theo hướng dẫn nhà sản xuất."
        ]
      },
      {
        "disease_name": "⚠️ Khuyến nghị ưu tiên & Phối hợp sinh học",
        "steps": [
          "Đầu tiên thực hiện biện pháp cho Đốm Nâu, sau 7 ngày tiếp tục Đạo Ôn. Không cần trộn hỗn hợp sinh học; mỗi loại dùng riêng."
        ]
      }
    ],
    "chemical": [
      {
        "disease_name": "Bệnh Đốm Nâu",
        "steps": [
          "Dùng đồng (Copper oxychloride) 2 kg/ha, pha loãng 1:200, phun 2 lần cách 14 ngày.",
          "Hoặc mancozeb 1 kg/ha, pha 1:100, cách 10 ngày nếu muốn thay thế."
        ]
      },
      {
        "disease_name": "Bệnh Đạo Ôn",
        "steps": [
          "Sử dụng azoxystrobin (strobilurin) 0.5 kg/ha, pha 1:250, phun 1 lần.",
          "Hoặc tricyclazole 0.8 kg/ha, pha 1:150, cách 12 ngày."
        ]
      },
      {
        "disease_name": "⚠️ Khuyến nghị ưu tiên & Phối hợp thuốc",
        "steps": [
          "Không trộn đồng với azoxystrobin hoặc tricyclazole; nguy cơ cháy lá cao.",
          "Phun đồng trước, chờ ít nhất 10 ngày rồi mới phun azoxystrobin/tricyclazole.",
          "Giữ khoảng cách thời gian 7-10 ngày giữa các loại thuốc để tránh độc tính chéo."
        ]
      }
    ],
    "cultural": [
      "Thu hoạch lá bệnh, tiêu hủy rác thải.",
      "Giảm độ ẩm bằng cách cải thiện thoát nước, tránh tưới qua lá.",
      "Điều chỉnh mật độ cây vừa, tăng khoảng cách giữa cây để giảm môi trường ẩm ướt.",
      "Thực hiện luân canh, trồng cây không nhạy cảm vào vụ sau."
    ]
  },
  "npk_adjustment": "Hướng dẫn điều chỉnh phân bón NPK chi tiết phù hợp với các bệnh được phát hiện.",
  "prevention_measures": ["Biện pháp phòng ngừa lâu dài 1", "Biện pháp phòng ngừa lâu dài 2"]
}
5. Lời khuyên phải NGẮN GỌN, SÚC TÍCH, đi thẳng vào vấn đề. Tuyệt đối KHÔNG lặp lại các từ ngữ (tránh lỗi lặp từ). Đảm bảo JSON sinh ra hoàn chỉnh và đúng cấu trúc.`;

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
        disease_name: diseaseList.map((d) => d.name).join(' & '),
        severity_assessment: 'Trung bình',
        immediate_actions: [],
        treatment_protocol: { biological: [], chemical: [], cultural: [] },
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
    diseases: string | { name: string; confidence: number; affectedAreaRatio: number }[],
    context?: string,
  ): Promise<HttpResponse<any>> {
    const isArray = Array.isArray(diseases);
    const diseaseName = isArray
      ? diseases.map((d) => d.name).join(' & ')
      : (diseases as string);
    this.logger.log(`Generating advisory for ${diseaseName}`);

    const result = await this.graph.invoke({
      disease: diseaseName,
      diseases: isArray
        ? diseases
        : [{ name: diseases, confidence: 1.0, affectedAreaRatio: 0.0 }],
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
