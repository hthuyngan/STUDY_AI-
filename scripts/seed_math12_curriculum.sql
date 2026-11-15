
SET NOCOUNT ON;
BEGIN TRANSACTION;

-- 1. Ensure sub_math12 is active and properly ordered
IF NOT EXISTS (SELECT 1 FROM content_subjects WHERE Id = 'sub_math12')
BEGIN
    INSERT INTO content_subjects (Id, Name, Code, Grade, Description, OrderIndex, IsActive, CreatedAt, UpdatedAt)
    VALUES ('sub_math12', N'Toán 12', 'MATH12', '12', N'Chương trình Toán học Lớp 12 - Bộ sách Kết nối tri thức với cuộc sống', 1, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
ELSE
BEGIN
    UPDATE content_subjects 
    SET Name = N'Toán 12', Code = 'MATH12', Grade = '12', Description = N'Chương trình Toán học Lớp 12 - Bộ sách Kết nối tri thức với cuộc sống', OrderIndex = 1, IsActive = 1, UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'sub_math12';
END

IF NOT EXISTS (SELECT 1 FROM content_chapters WHERE Id = 'chp_math12_c1')
BEGIN
    INSERT INTO content_chapters (Id, SubjectId, Title, Description, OrderIndex, IsActive, CreatedAt, UpdatedAt)
    VALUES ('chp_math12_c1', 'sub_math12', N'Chương 1: Ứng dụng đạo hàm để khảo sát và vẽ đồ thị của hàm số', N'Tính đơn điệu, cực trị, GTLN-GTNN, đường tiệm cận, khảo sát sự biến thiên và ứng dụng thực tiễn của hàm số.', 1, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
ELSE
BEGIN
    UPDATE content_chapters
    SET Title = N'Chương 1: Ứng dụng đạo hàm để khảo sát và vẽ đồ thị của hàm số', Description = N'Tính đơn điệu, cực trị, GTLN-GTNN, đường tiệm cận, khảo sát sự biến thiên và ứng dụng thực tiễn của hàm số.', OrderIndex = 1, IsActive = 1, UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'chp_math12_c1';
END

IF NOT EXISTS (SELECT 1 FROM content_chapters WHERE Id = 'chp_math12_c2')
BEGIN
    INSERT INTO content_chapters (Id, SubjectId, Title, Description, OrderIndex, IsActive, CreatedAt, UpdatedAt)
    VALUES ('chp_math12_c2', 'sub_math12', N'Chương 2: Vectơ và hệ toạ độ trong không gian', N'Vectơ trong không gian, hệ trục toạ độ Oxyz, các phép toán toạ độ và tích vô hướng.', 2, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
ELSE
BEGIN
    UPDATE content_chapters
    SET Title = N'Chương 2: Vectơ và hệ toạ độ trong không gian', Description = N'Vectơ trong không gian, hệ trục toạ độ Oxyz, các phép toán toạ độ và tích vô hướng.', OrderIndex = 2, IsActive = 1, UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'chp_math12_c2';
END

IF NOT EXISTS (SELECT 1 FROM content_chapters WHERE Id = 'chp_math12_c3')
BEGIN
    INSERT INTO content_chapters (Id, SubjectId, Title, Description, OrderIndex, IsActive, CreatedAt, UpdatedAt)
    VALUES ('chp_math12_c3', 'sub_math12', N'Chương 3: Các số đặc trưng đo mức độ phân tán cho mẫu số liệu ghép nhóm', N'Khoảng biến thiên, khoảng tứ phân vị, phương sai và độ lệch chuẩn của mẫu số liệu ghép nhóm.', 3, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
ELSE
BEGIN
    UPDATE content_chapters
    SET Title = N'Chương 3: Các số đặc trưng đo mức độ phân tán cho mẫu số liệu ghép nhóm', Description = N'Khoảng biến thiên, khoảng tứ phân vị, phương sai và độ lệch chuẩn của mẫu số liệu ghép nhóm.', OrderIndex = 3, IsActive = 1, UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'chp_math12_c3';
END

IF NOT EXISTS (SELECT 1 FROM content_chapters WHERE Id = 'chp_math12_c4')
BEGIN
    INSERT INTO content_chapters (Id, SubjectId, Title, Description, OrderIndex, IsActive, CreatedAt, UpdatedAt)
    VALUES ('chp_math12_c4', 'sub_math12', N'Chương 4: Nguyên hàm và tích phân', N'Khái niệm nguyên hàm, bảng nguyên hàm, các phương pháp tính tích phân và ứng dụng hình học.', 4, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
ELSE
BEGIN
    UPDATE content_chapters
    SET Title = N'Chương 4: Nguyên hàm và tích phân', Description = N'Khái niệm nguyên hàm, bảng nguyên hàm, các phương pháp tính tích phân và ứng dụng hình học.', OrderIndex = 4, IsActive = 1, UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'chp_math12_c4';
END

IF NOT EXISTS (SELECT 1 FROM content_chapters WHERE Id = 'chp_math12_c5')
BEGIN
    INSERT INTO content_chapters (Id, SubjectId, Title, Description, OrderIndex, IsActive, CreatedAt, UpdatedAt)
    VALUES ('chp_math12_c5', 'sub_math12', N'Chương 5: Phương pháp toạ độ trong không gian', N'Phương trình mặt phẳng, phương trình đường thẳng, công thức tính góc và phương trình mặt cầu trong không gian Oxyz.', 5, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
ELSE
BEGIN
    UPDATE content_chapters
    SET Title = N'Chương 5: Phương pháp toạ độ trong không gian', Description = N'Phương trình mặt phẳng, phương trình đường thẳng, công thức tính góc và phương trình mặt cầu trong không gian Oxyz.', OrderIndex = 5, IsActive = 1, UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'chp_math12_c5';
END

IF NOT EXISTS (SELECT 1 FROM content_chapters WHERE Id = 'chp_math12_c6')
BEGIN
    INSERT INTO content_chapters (Id, SubjectId, Title, Description, OrderIndex, IsActive, CreatedAt, UpdatedAt)
    VALUES ('chp_math12_c6', 'sub_math12', N'Chương 6: Xác suất có điều kiện', N'Khái niệm xác suất có điều kiện, công thức nhân xác suất, công thức xác suất toàn phần và định lý Bayes.', 6, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
ELSE
BEGIN
    UPDATE content_chapters
    SET Title = N'Chương 6: Xác suất có điều kiện', Description = N'Khái niệm xác suất có điều kiện, công thức nhân xác suất, công thức xác suất toàn phần và định lý Bayes.', OrderIndex = 6, IsActive = 1, UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'chp_math12_c6';
END

IF NOT EXISTS (SELECT 1 FROM content_topics WHERE Id = 'top_math12_c1_t1')
BEGIN
    INSERT INTO content_topics (Id, ChapterId, Title, Description, OrderIndex, IsActive, CreatedAt, UpdatedAt)
    VALUES ('top_math12_c1_t1', 'chp_math12_c1', N'Tính đơn điệu và cực trị của hàm số', N'', 1, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
ELSE
BEGIN
    UPDATE content_topics
    SET ChapterId = 'chp_math12_c1', Title = N'Tính đơn điệu và cực trị của hàm số', OrderIndex = 1, IsActive = 1, UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'top_math12_c1_t1';
END

IF NOT EXISTS (SELECT 1 FROM content_topics WHERE Id = 'top_math12_c1_t2')
BEGIN
    INSERT INTO content_topics (Id, ChapterId, Title, Description, OrderIndex, IsActive, CreatedAt, UpdatedAt)
    VALUES ('top_math12_c1_t2', 'chp_math12_c1', N'Giá trị lớn nhất và giá trị nhỏ nhất của hàm số', N'', 2, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
ELSE
BEGIN
    UPDATE content_topics
    SET ChapterId = 'chp_math12_c1', Title = N'Giá trị lớn nhất và giá trị nhỏ nhất của hàm số', OrderIndex = 2, IsActive = 1, UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'top_math12_c1_t2';
END

IF NOT EXISTS (SELECT 1 FROM content_topics WHERE Id = 'top_math12_c1_t3')
BEGIN
    INSERT INTO content_topics (Id, ChapterId, Title, Description, OrderIndex, IsActive, CreatedAt, UpdatedAt)
    VALUES ('top_math12_c1_t3', 'chp_math12_c1', N'Đường tiệm cận của đồ thị hàm số', N'', 3, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
ELSE
BEGIN
    UPDATE content_topics
    SET ChapterId = 'chp_math12_c1', Title = N'Đường tiệm cận của đồ thị hàm số', OrderIndex = 3, IsActive = 1, UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'top_math12_c1_t3';
END

IF NOT EXISTS (SELECT 1 FROM content_topics WHERE Id = 'top_math12_c1_t4')
BEGIN
    INSERT INTO content_topics (Id, ChapterId, Title, Description, OrderIndex, IsActive, CreatedAt, UpdatedAt)
    VALUES ('top_math12_c1_t4', 'chp_math12_c1', N'Khảo sát sự biến thiên và vẽ đồ thị hàm số', N'', 4, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
ELSE
BEGIN
    UPDATE content_topics
    SET ChapterId = 'chp_math12_c1', Title = N'Khảo sát sự biến thiên và vẽ đồ thị hàm số', OrderIndex = 4, IsActive = 1, UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'top_math12_c1_t4';
END

IF NOT EXISTS (SELECT 1 FROM content_topics WHERE Id = 'top_math12_c2_t1')
BEGIN
    INSERT INTO content_topics (Id, ChapterId, Title, Description, OrderIndex, IsActive, CreatedAt, UpdatedAt)
    VALUES ('top_math12_c2_t1', 'chp_math12_c2', N'Vectơ và các phép toán trong không gian', N'', 1, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
ELSE
BEGIN
    UPDATE content_topics
    SET ChapterId = 'chp_math12_c2', Title = N'Vectơ và các phép toán trong không gian', OrderIndex = 1, IsActive = 1, UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'top_math12_c2_t1';
END

IF NOT EXISTS (SELECT 1 FROM content_topics WHERE Id = 'top_math12_c2_t2')
BEGIN
    INSERT INTO content_topics (Id, ChapterId, Title, Description, OrderIndex, IsActive, CreatedAt, UpdatedAt)
    VALUES ('top_math12_c2_t2', 'chp_math12_c2', N'Hệ toạ độ Oxyz và toạ độ vectơ', N'', 2, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
ELSE
BEGIN
    UPDATE content_topics
    SET ChapterId = 'chp_math12_c2', Title = N'Hệ toạ độ Oxyz và toạ độ vectơ', OrderIndex = 2, IsActive = 1, UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'top_math12_c2_t2';
END

IF NOT EXISTS (SELECT 1 FROM content_topics WHERE Id = 'top_math12_c3_t1')
BEGIN
    INSERT INTO content_topics (Id, ChapterId, Title, Description, OrderIndex, IsActive, CreatedAt, UpdatedAt)
    VALUES ('top_math12_c3_t1', 'chp_math12_c3', N'Khoảng biến thiên và khoảng tứ phân vị', N'', 1, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
ELSE
BEGIN
    UPDATE content_topics
    SET ChapterId = 'chp_math12_c3', Title = N'Khoảng biến thiên và khoảng tứ phân vị', OrderIndex = 1, IsActive = 1, UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'top_math12_c3_t1';
END

IF NOT EXISTS (SELECT 1 FROM content_topics WHERE Id = 'top_math12_c3_t2')
BEGIN
    INSERT INTO content_topics (Id, ChapterId, Title, Description, OrderIndex, IsActive, CreatedAt, UpdatedAt)
    VALUES ('top_math12_c3_t2', 'chp_math12_c3', N'Phương sai và độ lệch chuẩn của số liệu ghép nhóm', N'', 2, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
ELSE
BEGIN
    UPDATE content_topics
    SET ChapterId = 'chp_math12_c3', Title = N'Phương sai và độ lệch chuẩn của số liệu ghép nhóm', OrderIndex = 2, IsActive = 1, UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'top_math12_c3_t2';
END

IF NOT EXISTS (SELECT 1 FROM content_topics WHERE Id = 'top_math12_c4_t1')
BEGIN
    INSERT INTO content_topics (Id, ChapterId, Title, Description, OrderIndex, IsActive, CreatedAt, UpdatedAt)
    VALUES ('top_math12_c4_t1', 'chp_math12_c4', N'Nguyên hàm và phương pháp tính', N'', 1, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
ELSE
BEGIN
    UPDATE content_topics
    SET ChapterId = 'chp_math12_c4', Title = N'Nguyên hàm và phương pháp tính', OrderIndex = 1, IsActive = 1, UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'top_math12_c4_t1';
END

IF NOT EXISTS (SELECT 1 FROM content_topics WHERE Id = 'top_math12_c4_t2')
BEGIN
    INSERT INTO content_topics (Id, ChapterId, Title, Description, OrderIndex, IsActive, CreatedAt, UpdatedAt)
    VALUES ('top_math12_c4_t2', 'chp_math12_c4', N'Tích phân và ứng dụng hình học', N'', 2, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
ELSE
BEGIN
    UPDATE content_topics
    SET ChapterId = 'chp_math12_c4', Title = N'Tích phân và ứng dụng hình học', OrderIndex = 2, IsActive = 1, UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'top_math12_c4_t2';
END

IF NOT EXISTS (SELECT 1 FROM content_topics WHERE Id = 'top_math12_c5_t1')
BEGIN
    INSERT INTO content_topics (Id, ChapterId, Title, Description, OrderIndex, IsActive, CreatedAt, UpdatedAt)
    VALUES ('top_math12_c5_t1', 'chp_math12_c5', N'Mặt phẳng và đường thẳng trong không gian', N'', 1, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
ELSE
BEGIN
    UPDATE content_topics
    SET ChapterId = 'chp_math12_c5', Title = N'Mặt phẳng và đường thẳng trong không gian', OrderIndex = 1, IsActive = 1, UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'top_math12_c5_t1';
END

IF NOT EXISTS (SELECT 1 FROM content_topics WHERE Id = 'top_math12_c5_t2')
BEGIN
    INSERT INTO content_topics (Id, ChapterId, Title, Description, OrderIndex, IsActive, CreatedAt, UpdatedAt)
    VALUES ('top_math12_c5_t2', 'chp_math12_c5', N'Mặt cầu và công thức tính góc', N'', 2, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
ELSE
BEGIN
    UPDATE content_topics
    SET ChapterId = 'chp_math12_c5', Title = N'Mặt cầu và công thức tính góc', OrderIndex = 2, IsActive = 1, UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'top_math12_c5_t2';
END

IF NOT EXISTS (SELECT 1 FROM content_topics WHERE Id = 'top_math12_c6_t1')
BEGIN
    INSERT INTO content_topics (Id, ChapterId, Title, Description, OrderIndex, IsActive, CreatedAt, UpdatedAt)
    VALUES ('top_math12_c6_t1', 'chp_math12_c6', N'Xác suất có điều kiện và công thức Bayes', N'', 1, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
ELSE
BEGIN
    UPDATE content_topics
    SET ChapterId = 'chp_math12_c6', Title = N'Xác suất có điều kiện và công thức Bayes', OrderIndex = 1, IsActive = 1, UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'top_math12_c6_t1';
END

IF NOT EXISTS (SELECT 1 FROM content_lessons WHERE Id = 'les_math12_c1_b1')
BEGIN
    INSERT INTO content_lessons (
        Id, ChapterId, TopicId, Title, Slug, OrderIndex, Status, AuthorId,
        LearningObjectivesJson, Introduction, DefinitionsJson, FormulasJson, ExamplesJson, ImportantNotesJson, SummaryPointsJson,
        CreatedAt, UpdatedAt
    )
    VALUES (
        'les_math12_c1_b1', 'chp_math12_c1', N'top_math12_c1_t1', N'Bài 1: Tính đơn điệu của hàm số', 'tinh-don-dieu-cua-ham-so', 1, 'published', 'usr_content_1e88ba27ab124caa9bd6c1fcdba4c99a',
        N'["Hiểu rõ định lý về dấu của đạo hàm cấp một và tính đơn điệu.","Biết cách lập bảng xét dấu đạo hàm và bảng biến thiên.","Vận dụng giải các bài toán tìm khoảng đồng biến, nghịch biến có chứa tham số m."]', N'Tính đơn điệu (đồng biến, nghịch biến) phản ánh xu hướng tăng giảm của giá trị $y$ khi biến số $x$ thay đổi. Bằng công cụ đạo hàm, ta có thể khảo sát sự biến thiên của hàm số một cách chính xác trên từng khoảng xác định.', N'["Hàm số đồng biến: Cho hàm số y = f(x) xác định trên khoảng (a; b). Hàm số được gọi là đồng biến (tăng) trên (a; b) nếu với mọi x_1, x_2 thuộc (a; b) mà x_1 < x_2 thì f(x_1) < f(x_2).","Hàm số nghịch biến: Cho hàm số y = f(x) xác định trên khoảng (a; b). Hàm số được gọi là nghịch biến (giảm) trên (a; b) nếu với mọi x_1, x_2 thuộc (a; b) mà x_1 < x_2 thì f(x_1) > f(x_2)."]', N'["f''(x) \\ge 0, \\forall x \\in (a; b) \\text{ (bằng 0 tại hữu hạn điểm) } \\implies f(x) \\text{ đồng biến trên } (a; b)","f''(x) \\le 0, \\forall x \\in (a; b) \\text{ (bằng 0 tại hữu hạn điểm) } \\implies f(x) \\text{ nghịch biến trên } (a; b)","f''(x_0) = \\lim_{x \\to x_0} \\frac{f(x) - f(x_0)}{x - x_0}"]', N'["Ví dụ 1: Tìm các khoảng đơn điệu của hàm số f(x) = x^3 - 3x^2 + 2: Đạo hàm f''(x) = 3x^2 - 6x = 3x(x - 2). Cho f''(x) = 0 ta có x = 0 hoặc x = 2. Lập bảng xét dấu: f''(x) > 0 trên (-∞; 0) và (2; +∞) -> hàm số đồng biến. f''(x) < 0 trên (0; 2) -> hàm số nghịch biến."]', N'["Dấu \"=\" của đạo hàm chỉ được xảy ra tại hữu hạn điểm.","Không dùng ký hiệu hợp (∪) khi kết luận các khoảng đồng biến, nghịch biến; phải dùng từ \"và\" hoặc liệt kê riêng từng khoảng."]', N'["Quy tắc 3 bước xét tính đơn điệu: 1) Tìm TXĐ và tính đạo hàm f''(x); 2) Tìm nghiệm f''(x) = 0; 3) Lập bảng biến thiên và kết luận."]',
        SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lessons
    SET ChapterId = 'chp_math12_c1',
        TopicId = N'top_math12_c1_t1',
        Title = N'Bài 1: Tính đơn điệu của hàm số',
        Slug = 'tinh-don-dieu-cua-ham-so',
        OrderIndex = 1,
        Status = 'published',
        LearningObjectivesJson = N'["Hiểu rõ định lý về dấu của đạo hàm cấp một và tính đơn điệu.","Biết cách lập bảng xét dấu đạo hàm và bảng biến thiên.","Vận dụng giải các bài toán tìm khoảng đồng biến, nghịch biến có chứa tham số m."]',
        Introduction = N'Tính đơn điệu (đồng biến, nghịch biến) phản ánh xu hướng tăng giảm của giá trị $y$ khi biến số $x$ thay đổi. Bằng công cụ đạo hàm, ta có thể khảo sát sự biến thiên của hàm số một cách chính xác trên từng khoảng xác định.',
        DefinitionsJson = N'["Hàm số đồng biến: Cho hàm số y = f(x) xác định trên khoảng (a; b). Hàm số được gọi là đồng biến (tăng) trên (a; b) nếu với mọi x_1, x_2 thuộc (a; b) mà x_1 < x_2 thì f(x_1) < f(x_2).","Hàm số nghịch biến: Cho hàm số y = f(x) xác định trên khoảng (a; b). Hàm số được gọi là nghịch biến (giảm) trên (a; b) nếu với mọi x_1, x_2 thuộc (a; b) mà x_1 < x_2 thì f(x_1) > f(x_2)."]',
        FormulasJson = N'["f''(x) \\ge 0, \\forall x \\in (a; b) \\text{ (bằng 0 tại hữu hạn điểm) } \\implies f(x) \\text{ đồng biến trên } (a; b)","f''(x) \\le 0, \\forall x \\in (a; b) \\text{ (bằng 0 tại hữu hạn điểm) } \\implies f(x) \\text{ nghịch biến trên } (a; b)","f''(x_0) = \\lim_{x \\to x_0} \\frac{f(x) - f(x_0)}{x - x_0}"]',
        ExamplesJson = N'["Ví dụ 1: Tìm các khoảng đơn điệu của hàm số f(x) = x^3 - 3x^2 + 2: Đạo hàm f''(x) = 3x^2 - 6x = 3x(x - 2). Cho f''(x) = 0 ta có x = 0 hoặc x = 2. Lập bảng xét dấu: f''(x) > 0 trên (-∞; 0) và (2; +∞) -> hàm số đồng biến. f''(x) < 0 trên (0; 2) -> hàm số nghịch biến."]',
        ImportantNotesJson = N'["Dấu \"=\" của đạo hàm chỉ được xảy ra tại hữu hạn điểm.","Không dùng ký hiệu hợp (∪) khi kết luận các khoảng đồng biến, nghịch biến; phải dùng từ \"và\" hoặc liệt kê riêng từng khoảng."]',
        SummaryPointsJson = N'["Quy tắc 3 bước xét tính đơn điệu: 1) Tìm TXĐ và tính đạo hàm f''(x); 2) Tìm nghiệm f''(x) = 0; 3) Lập bảng biến thiên và kết luận."]',
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'les_math12_c1_b1';
END

IF NOT EXISTS (SELECT 1 FROM content_lessons WHERE Id = 'les_math12_c1_b2')
BEGIN
    INSERT INTO content_lessons (
        Id, ChapterId, TopicId, Title, Slug, OrderIndex, Status, AuthorId,
        LearningObjectivesJson, Introduction, DefinitionsJson, FormulasJson, ExamplesJson, ImportantNotesJson, SummaryPointsJson,
        CreatedAt, UpdatedAt
    )
    VALUES (
        'les_math12_c1_b2', 'chp_math12_c1', N'top_math12_c1_t1', N'Bài 2: Cực trị của hàm số', 'cuc-tri-cua-ham-so', 2, 'published', 'usr_content_1e88ba27ab124caa9bd6c1fcdba4c99a',
        N'["Nắm vững khái niệm điểm cực đại, điểm cực tiểu, giá trị cực đại, giá trị cực tiểu.","Thành thạo Quy tắc 1 (đổi dấu đạo hàm) và Quy tắc 2 (đạo hàm cấp 2)."]', N'Cực trị của hàm số là những điểm mà tại đó đồ thị đạt đỉnh cao cục bộ (cực đại) hoặc đáy trũng cục bộ (cực tiểu) so với các điểm lân cận.', N'["Điểm cực đại: Điểm x_0 sao cho f(x) < f(x_0) với mọi x trong lân cận của x_0.","Điểm cực tiểu: Điểm x_0 sao cho f(x) > f(x_0) với mọi x trong lân cận của x_0."]', N'["\\text{Quy tắc 1: } f''(x) \\text{ đổi dấu từ } + \\to - \\implies x_0 \\text{ là điểm cực đại}","\\text{Quy tắc 2: } f''(x_0) = 0, f''''(x_0) < 0 \\implies x_0 \\text{ là điểm cực đại}; f''''(x_0) > 0 \\implies x_0 \\text{ là điểm cực tiểu}"]', N'["Ví dụ 1: Tìm cực trị của hàm số y = -x^3 + 3x + 1: y'' = -3x^2 + 3 = 0 <=> x = 1 hoặc x = -1. x = -1 là điểm cực tiểu, y_CT = -1; x = 1 là điểm cực đại, y_CD = 3."]', N'["Phân biệt: Điểm cực trị của hàm số (x_0), Giá trị cực trị (y_0) và Điểm cực trị của đồ thị (M(x_0; y_0))."]', N'["Hàm đa thức bậc ba y = ax^3 + bx^2 + cx + d có 2 cực trị khi phương trình y'' = 0 có 2 nghiệm phân biệt."]',
        SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lessons
    SET ChapterId = 'chp_math12_c1',
        TopicId = N'top_math12_c1_t1',
        Title = N'Bài 2: Cực trị của hàm số',
        Slug = 'cuc-tri-cua-ham-so',
        OrderIndex = 2,
        Status = 'published',
        LearningObjectivesJson = N'["Nắm vững khái niệm điểm cực đại, điểm cực tiểu, giá trị cực đại, giá trị cực tiểu.","Thành thạo Quy tắc 1 (đổi dấu đạo hàm) và Quy tắc 2 (đạo hàm cấp 2)."]',
        Introduction = N'Cực trị của hàm số là những điểm mà tại đó đồ thị đạt đỉnh cao cục bộ (cực đại) hoặc đáy trũng cục bộ (cực tiểu) so với các điểm lân cận.',
        DefinitionsJson = N'["Điểm cực đại: Điểm x_0 sao cho f(x) < f(x_0) với mọi x trong lân cận của x_0.","Điểm cực tiểu: Điểm x_0 sao cho f(x) > f(x_0) với mọi x trong lân cận của x_0."]',
        FormulasJson = N'["\\text{Quy tắc 1: } f''(x) \\text{ đổi dấu từ } + \\to - \\implies x_0 \\text{ là điểm cực đại}","\\text{Quy tắc 2: } f''(x_0) = 0, f''''(x_0) < 0 \\implies x_0 \\text{ là điểm cực đại}; f''''(x_0) > 0 \\implies x_0 \\text{ là điểm cực tiểu}"]',
        ExamplesJson = N'["Ví dụ 1: Tìm cực trị của hàm số y = -x^3 + 3x + 1: y'' = -3x^2 + 3 = 0 <=> x = 1 hoặc x = -1. x = -1 là điểm cực tiểu, y_CT = -1; x = 1 là điểm cực đại, y_CD = 3."]',
        ImportantNotesJson = N'["Phân biệt: Điểm cực trị của hàm số (x_0), Giá trị cực trị (y_0) và Điểm cực trị của đồ thị (M(x_0; y_0))."]',
        SummaryPointsJson = N'["Hàm đa thức bậc ba y = ax^3 + bx^2 + cx + d có 2 cực trị khi phương trình y'' = 0 có 2 nghiệm phân biệt."]',
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'les_math12_c1_b2';
END

IF NOT EXISTS (SELECT 1 FROM content_lessons WHERE Id = 'les_math12_c1_b3')
BEGIN
    INSERT INTO content_lessons (
        Id, ChapterId, TopicId, Title, Slug, OrderIndex, Status, AuthorId,
        LearningObjectivesJson, Introduction, DefinitionsJson, FormulasJson, ExamplesJson, ImportantNotesJson, SummaryPointsJson,
        CreatedAt, UpdatedAt
    )
    VALUES (
        'les_math12_c1_b3', 'chp_math12_c1', N'top_math12_c1_t2', N'Bài 3: Giá trị lớn nhất và nhỏ nhất của hàm số', 'gia-tri-lon-nhat-va-nho-nhat', 3, 'published', 'usr_content_1e88ba27ab124caa9bd6c1fcdba4c99a',
        N'["Nắm vững định nghĩa GTLN, GTNN trên tập D.","Thuần thục phương pháp tìm GTLN, GTNN trên đoạn không cần lập bảng biến thiên."]', N'Tìm GTLN và GTNN của hàm số là công cụ toán học ứng dụng rộng rãi nhất trong thực tế, từ tối ưu chi phí sản xuất đến tối đa hóa lợi nhuận.', N'["Giá trị lớn nhất: M = \\max_{x \\in D} f(x) \\iff f(x) \\le M, \\forall x \\in D \\text{ và } \\exists x_0 \\in D: f(x_0) = M."]', N'["\\text{Trên đoạn } [a; b]: \\max f(x) = \\max \\{ f(a), f(b), f(x_i) \\}, \\quad \\min f(x) = \\min \\{ f(a), f(b), f(x_i) \\}"]', N'["Ví dụ 1: Tìm GTLN, GTNN của f(x) = x^4 - 2x^2 + 3 trên [-3; 2]: f''(x) = 4x(x^2 - 1) = 0 <=> x = 0, x = ±1. So sánh f(-3)=66, f(2)=11, f(0)=3, f(±1)=2. Max = 66, Min = 2."]', N'["Hàm liên tục trên đoạn [a; b] luôn đạt GTLN và GTNN trên đoạn đó."]', N'["Tìm max, min trên đoạn [a; b]: tính f''(x); tìm nghiệm x_i trong (a; b); tính giá trị tại các đầu mút và nghiệm; so sánh."]',
        SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lessons
    SET ChapterId = 'chp_math12_c1',
        TopicId = N'top_math12_c1_t2',
        Title = N'Bài 3: Giá trị lớn nhất và nhỏ nhất của hàm số',
        Slug = 'gia-tri-lon-nhat-va-nho-nhat',
        OrderIndex = 3,
        Status = 'published',
        LearningObjectivesJson = N'["Nắm vững định nghĩa GTLN, GTNN trên tập D.","Thuần thục phương pháp tìm GTLN, GTNN trên đoạn không cần lập bảng biến thiên."]',
        Introduction = N'Tìm GTLN và GTNN của hàm số là công cụ toán học ứng dụng rộng rãi nhất trong thực tế, từ tối ưu chi phí sản xuất đến tối đa hóa lợi nhuận.',
        DefinitionsJson = N'["Giá trị lớn nhất: M = \\max_{x \\in D} f(x) \\iff f(x) \\le M, \\forall x \\in D \\text{ và } \\exists x_0 \\in D: f(x_0) = M."]',
        FormulasJson = N'["\\text{Trên đoạn } [a; b]: \\max f(x) = \\max \\{ f(a), f(b), f(x_i) \\}, \\quad \\min f(x) = \\min \\{ f(a), f(b), f(x_i) \\}"]',
        ExamplesJson = N'["Ví dụ 1: Tìm GTLN, GTNN của f(x) = x^4 - 2x^2 + 3 trên [-3; 2]: f''(x) = 4x(x^2 - 1) = 0 <=> x = 0, x = ±1. So sánh f(-3)=66, f(2)=11, f(0)=3, f(±1)=2. Max = 66, Min = 2."]',
        ImportantNotesJson = N'["Hàm liên tục trên đoạn [a; b] luôn đạt GTLN và GTNN trên đoạn đó."]',
        SummaryPointsJson = N'["Tìm max, min trên đoạn [a; b]: tính f''(x); tìm nghiệm x_i trong (a; b); tính giá trị tại các đầu mút và nghiệm; so sánh."]',
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'les_math12_c1_b3';
END

IF NOT EXISTS (SELECT 1 FROM content_lessons WHERE Id = 'les_math12_c1_b4')
BEGIN
    INSERT INTO content_lessons (
        Id, ChapterId, TopicId, Title, Slug, OrderIndex, Status, AuthorId,
        LearningObjectivesJson, Introduction, DefinitionsJson, FormulasJson, ExamplesJson, ImportantNotesJson, SummaryPointsJson,
        CreatedAt, UpdatedAt
    )
    VALUES (
        'les_math12_c1_b4', 'chp_math12_c1', N'top_math12_c1_t3', N'Bài 4: Đường tiệm cận của đồ thị hàm số', 'duong-tiem-can-cua-do-thi-ham-so', 4, 'published', 'usr_content_1e88ba27ab124caa9bd6c1fcdba4c99a',
        N'["Hiểu rõ tiệm cận đứng, tiệm cận ngang và tiệm cận xiên.","Sử dụng giới hạn lim để xác định phương trình tiệm cận."]', N'Đường tiệm cận mô tả hình dáng đồ thị hàm số ở vô cực hoặc gần các điểm gián đoạn, cho biết xu hướng tiệm cận của đường cong.', N'["Tiệm cận ngang: Đường thẳng y = y_0 nếu lim_{x \\to +\\infty} f(x) = y_0 hoặc lim_{x \\to -\\infty} f(x) = y_0.","Tiệm cận đứng: Đường thẳng x = x_0 nếu lim_{x \\to x_0^+} f(x) = \\pm\\infty hoặc lim_{x \\to x_0^-} f(x) = \\pm\\infty.","Tiệm cận xiên: Đường thẳng y = ax + b (a \\ne 0) nếu lim_{x \\to \\pm\\infty} [f(x) - (ax + b)] = 0."]', N'["a = \\lim_{x \\to \\pm\\infty} \\frac{f(x)}{x}, \\quad b = \\lim_{x \\to \\pm\\infty} [f(x) - ax]"]', N'["Ví dụ 1: Tìm tiệm cận của hàm số y = (2x + 1)/(x - 1): TCĐ là x = 1 vì mẫu số bằng 0; TCN là y = 2 vì bậc tử bằng bậc mẫu."]', N'["Đồ thị hàm phân thức bậc hai trên bậc nhất luôn có 1 tiệm cận đứng và 1 tiệm cận xiên."]', N'["Quy tắc tìm tiệm cận: Tính giới hạn tại điểm gián đoạn tìm TCĐ; tính giới hạn khi x ra vô cực tìm TCN hoặc TC xiên."]',
        SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lessons
    SET ChapterId = 'chp_math12_c1',
        TopicId = N'top_math12_c1_t3',
        Title = N'Bài 4: Đường tiệm cận của đồ thị hàm số',
        Slug = 'duong-tiem-can-cua-do-thi-ham-so',
        OrderIndex = 4,
        Status = 'published',
        LearningObjectivesJson = N'["Hiểu rõ tiệm cận đứng, tiệm cận ngang và tiệm cận xiên.","Sử dụng giới hạn lim để xác định phương trình tiệm cận."]',
        Introduction = N'Đường tiệm cận mô tả hình dáng đồ thị hàm số ở vô cực hoặc gần các điểm gián đoạn, cho biết xu hướng tiệm cận của đường cong.',
        DefinitionsJson = N'["Tiệm cận ngang: Đường thẳng y = y_0 nếu lim_{x \\to +\\infty} f(x) = y_0 hoặc lim_{x \\to -\\infty} f(x) = y_0.","Tiệm cận đứng: Đường thẳng x = x_0 nếu lim_{x \\to x_0^+} f(x) = \\pm\\infty hoặc lim_{x \\to x_0^-} f(x) = \\pm\\infty.","Tiệm cận xiên: Đường thẳng y = ax + b (a \\ne 0) nếu lim_{x \\to \\pm\\infty} [f(x) - (ax + b)] = 0."]',
        FormulasJson = N'["a = \\lim_{x \\to \\pm\\infty} \\frac{f(x)}{x}, \\quad b = \\lim_{x \\to \\pm\\infty} [f(x) - ax]"]',
        ExamplesJson = N'["Ví dụ 1: Tìm tiệm cận của hàm số y = (2x + 1)/(x - 1): TCĐ là x = 1 vì mẫu số bằng 0; TCN là y = 2 vì bậc tử bằng bậc mẫu."]',
        ImportantNotesJson = N'["Đồ thị hàm phân thức bậc hai trên bậc nhất luôn có 1 tiệm cận đứng và 1 tiệm cận xiên."]',
        SummaryPointsJson = N'["Quy tắc tìm tiệm cận: Tính giới hạn tại điểm gián đoạn tìm TCĐ; tính giới hạn khi x ra vô cực tìm TCN hoặc TC xiên."]',
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'les_math12_c1_b4';
END

IF NOT EXISTS (SELECT 1 FROM content_lessons WHERE Id = 'les_math12_c1_b5')
BEGIN
    INSERT INTO content_lessons (
        Id, ChapterId, TopicId, Title, Slug, OrderIndex, Status, AuthorId,
        LearningObjectivesJson, Introduction, DefinitionsJson, FormulasJson, ExamplesJson, ImportantNotesJson, SummaryPointsJson,
        CreatedAt, UpdatedAt
    )
    VALUES (
        'les_math12_c1_b5', 'chp_math12_c1', N'top_math12_c1_t4', N'Bài 5: Khảo sát sự biến thiên và vẽ đồ thị hàm số', 'khao-sat-va-ve-do-thi-ham-so', 5, 'published', 'usr_content_1e88ba27ab124caa9bd6c1fcdba4c99a',
        N'["Nắm vững sơ đồ 3 bước khảo sát sự biến thiên và vẽ đồ thị hàm số.","Nhận biết tâm đối xứng và trục đối xứng của đồ thị.","Giải bài toán ứng dụng đạo hàm thực tế (tối ưu thể tích, chi phí)."]', N'Khảo sát hàm số là bước tổng hợp toàn bộ kiến thức đạo hàm, cực trị, tiệm cận để phác thảo chính xác hình dạng đồ thị và ứng dụng giải toán thực tế.', N'["Sơ đồ khảo sát: 1) TXĐ; 2) Sự biến thiên (đạo hàm, cực trị, giới hạn, tiệm cận, bảng biến thiên); 3) Vẽ đồ thị."]', N'["\\text{Hàm bậc 3: } y = ax^3 + bx^2 + cx + d \\quad (a \\ne 0)","\\text{Hàm phân thức: } y = \\frac{ax + b}{cx + d} \\quad (ad - bc \\ne 0, c \\ne 0)"]', N'["Ví dụ: Một người thợ muốn làm một thùng tôn hình trụ không nắp dung tích V. Tìm bán kính đáy r và chiều cao h để tiết kiệm tôn nhất."]', N'["Tâm đối xứng của hàm bậc 3 là điểm uốn (nghiệm y'''' = 0). Tâm đối xứng của hàm nhất biến là giao điểm 2 tiệm cận."]', N'["Đồ thị hàm số minh họa trực quan tính chất biến thiên và là công cụ biện luận số nghiệm phương trình f(x) = m."]',
        SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lessons
    SET ChapterId = 'chp_math12_c1',
        TopicId = N'top_math12_c1_t4',
        Title = N'Bài 5: Khảo sát sự biến thiên và vẽ đồ thị hàm số',
        Slug = 'khao-sat-va-ve-do-thi-ham-so',
        OrderIndex = 5,
        Status = 'published',
        LearningObjectivesJson = N'["Nắm vững sơ đồ 3 bước khảo sát sự biến thiên và vẽ đồ thị hàm số.","Nhận biết tâm đối xứng và trục đối xứng của đồ thị.","Giải bài toán ứng dụng đạo hàm thực tế (tối ưu thể tích, chi phí)."]',
        Introduction = N'Khảo sát hàm số là bước tổng hợp toàn bộ kiến thức đạo hàm, cực trị, tiệm cận để phác thảo chính xác hình dạng đồ thị và ứng dụng giải toán thực tế.',
        DefinitionsJson = N'["Sơ đồ khảo sát: 1) TXĐ; 2) Sự biến thiên (đạo hàm, cực trị, giới hạn, tiệm cận, bảng biến thiên); 3) Vẽ đồ thị."]',
        FormulasJson = N'["\\text{Hàm bậc 3: } y = ax^3 + bx^2 + cx + d \\quad (a \\ne 0)","\\text{Hàm phân thức: } y = \\frac{ax + b}{cx + d} \\quad (ad - bc \\ne 0, c \\ne 0)"]',
        ExamplesJson = N'["Ví dụ: Một người thợ muốn làm một thùng tôn hình trụ không nắp dung tích V. Tìm bán kính đáy r và chiều cao h để tiết kiệm tôn nhất."]',
        ImportantNotesJson = N'["Tâm đối xứng của hàm bậc 3 là điểm uốn (nghiệm y'''' = 0). Tâm đối xứng của hàm nhất biến là giao điểm 2 tiệm cận."]',
        SummaryPointsJson = N'["Đồ thị hàm số minh họa trực quan tính chất biến thiên và là công cụ biện luận số nghiệm phương trình f(x) = m."]',
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'les_math12_c1_b5';
END

IF NOT EXISTS (SELECT 1 FROM content_lessons WHERE Id = 'les_math12_c2_b1')
BEGIN
    INSERT INTO content_lessons (
        Id, ChapterId, TopicId, Title, Slug, OrderIndex, Status, AuthorId,
        LearningObjectivesJson, Introduction, DefinitionsJson, FormulasJson, ExamplesJson, ImportantNotesJson, SummaryPointsJson,
        CreatedAt, UpdatedAt
    )
    VALUES (
        'les_math12_c2_b1', 'chp_math12_c2', N'top_math12_c2_t1', N'Bài 6: Vectơ trong không gian', 'vecto-trong-khong-gian', 1, 'published', 'usr_content_1e88ba27ab124caa9bd6c1fcdba4c99a',
        N'["Nắm định nghĩa vectơ trong không gian, vectơ cùng phương, đồng phẳng.","Thành thạo quy tắc 3 điểm, hình bình hành, hình hộp và trọng tâm."]', N'Vectơ trong không gian mở rộng khái niệm vectơ hình học phẳng sang không gian 3 chiều, là ngôn ngữ đại số mạnh mẽ trong cơ học và không gian Oxyz.', N'["Vectơ trong không gian: Đoạn thẳng có hướng xác định điểm đầu và điểm cuối.","Quy tắc hình hộp: Cho hình hộp ABCD.A''B''C''D'', ta có vectơ AC'' = AB + AD + AA''."]', N'["\\vec{AC''} = \\vec{AB} + \\vec{AD} + \\vec{AA''}","\\vec{u} \\cdot \\vec{v} = |\\vec{u}| \\cdot |\\vec{v}| \\cdot \\cos(\\vec{u}, \\vec{v})"]', N'["Ví dụ 1: Cho tứ diện ABCD có G là trọng tâm. Chứng minh GA + GB + GC + GD = 0."]', N'["Điều kiện 3 vectơ đồng phẳng: vec{w} = k.vec{u} + m.vec{v}."]', N'["Tích vô hướng hai vectơ cho phép tính góc và chứng minh hai đường thẳng vuông góc trong không gian."]',
        SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lessons
    SET ChapterId = 'chp_math12_c2',
        TopicId = N'top_math12_c2_t1',
        Title = N'Bài 6: Vectơ trong không gian',
        Slug = 'vecto-trong-khong-gian',
        OrderIndex = 1,
        Status = 'published',
        LearningObjectivesJson = N'["Nắm định nghĩa vectơ trong không gian, vectơ cùng phương, đồng phẳng.","Thành thạo quy tắc 3 điểm, hình bình hành, hình hộp và trọng tâm."]',
        Introduction = N'Vectơ trong không gian mở rộng khái niệm vectơ hình học phẳng sang không gian 3 chiều, là ngôn ngữ đại số mạnh mẽ trong cơ học và không gian Oxyz.',
        DefinitionsJson = N'["Vectơ trong không gian: Đoạn thẳng có hướng xác định điểm đầu và điểm cuối.","Quy tắc hình hộp: Cho hình hộp ABCD.A''B''C''D'', ta có vectơ AC'' = AB + AD + AA''."]',
        FormulasJson = N'["\\vec{AC''} = \\vec{AB} + \\vec{AD} + \\vec{AA''}","\\vec{u} \\cdot \\vec{v} = |\\vec{u}| \\cdot |\\vec{v}| \\cdot \\cos(\\vec{u}, \\vec{v})"]',
        ExamplesJson = N'["Ví dụ 1: Cho tứ diện ABCD có G là trọng tâm. Chứng minh GA + GB + GC + GD = 0."]',
        ImportantNotesJson = N'["Điều kiện 3 vectơ đồng phẳng: vec{w} = k.vec{u} + m.vec{v}."]',
        SummaryPointsJson = N'["Tích vô hướng hai vectơ cho phép tính góc và chứng minh hai đường thẳng vuông góc trong không gian."]',
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'les_math12_c2_b1';
END

IF NOT EXISTS (SELECT 1 FROM content_lessons WHERE Id = 'les_math12_c2_b2')
BEGIN
    INSERT INTO content_lessons (
        Id, ChapterId, TopicId, Title, Slug, OrderIndex, Status, AuthorId,
        LearningObjectivesJson, Introduction, DefinitionsJson, FormulasJson, ExamplesJson, ImportantNotesJson, SummaryPointsJson,
        CreatedAt, UpdatedAt
    )
    VALUES (
        'les_math12_c2_b2', 'chp_math12_c2', N'top_math12_c2_t2', N'Bài 7: Hệ trục toạ độ trong không gian', 'he-truc-toa-do-trong-khong-gian', 2, 'published', 'usr_content_1e88ba27ab124caa9bd6c1fcdba4c99a',
        N'["Hiểu cấu tạo hệ toạ độ vuông góc Oxyz với 3 vectơ đơn vị i, j, k.","Xác định toạ độ của điểm và toạ độ của vectơ."]', N'Hệ trục toạ độ Oxyz gắn kết hình học không gian với đại số giải tích, cho phép mô tả mọi điểm, đường thẳng và mặt phẳng bằng các bộ số (x, y, z).', N'["Hệ toạ độ Oxyz: Gồm ba trục Ox, Oy, Oz vuông góc từng đôi một tại gốc O.","Toạ độ vectơ u: u = x.i + y.j + z.k <=> u = (x; y; z)."]', N'["\\vec{u} = (x; y; z) \\iff \\vec{u} = x\\vec{i} + y\\vec{j} + z\\vec{k}","M(x; y; z) \\iff \\vec{OM} = (x; y; z)","\\vec{AB} = (x_B - x_A; y_B - y_A; z_B - z_A)"]', N'["Ví dụ: Cho A(1; 2; -1) và B(3; 0; 2). Toạ độ trung điểm M của AB là M((1+3)/2; (2+0)/2; (-1+2)/2) = M(2; 1; 1/2)."]', N'["Toạ độ hình chiếu của M(x; y; z) lên Oxy là (x; y; 0), lên Ox là (x; 0; 0)."]', N'["Hệ toạ độ Oxyz biến các bài toán chứng minh hình học không gian phức tạp thành các phép toán đại số cơ bản."]',
        SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lessons
    SET ChapterId = 'chp_math12_c2',
        TopicId = N'top_math12_c2_t2',
        Title = N'Bài 7: Hệ trục toạ độ trong không gian',
        Slug = 'he-truc-toa-do-trong-khong-gian',
        OrderIndex = 2,
        Status = 'published',
        LearningObjectivesJson = N'["Hiểu cấu tạo hệ toạ độ vuông góc Oxyz với 3 vectơ đơn vị i, j, k.","Xác định toạ độ của điểm và toạ độ của vectơ."]',
        Introduction = N'Hệ trục toạ độ Oxyz gắn kết hình học không gian với đại số giải tích, cho phép mô tả mọi điểm, đường thẳng và mặt phẳng bằng các bộ số (x, y, z).',
        DefinitionsJson = N'["Hệ toạ độ Oxyz: Gồm ba trục Ox, Oy, Oz vuông góc từng đôi một tại gốc O.","Toạ độ vectơ u: u = x.i + y.j + z.k <=> u = (x; y; z)."]',
        FormulasJson = N'["\\vec{u} = (x; y; z) \\iff \\vec{u} = x\\vec{i} + y\\vec{j} + z\\vec{k}","M(x; y; z) \\iff \\vec{OM} = (x; y; z)","\\vec{AB} = (x_B - x_A; y_B - y_A; z_B - z_A)"]',
        ExamplesJson = N'["Ví dụ: Cho A(1; 2; -1) và B(3; 0; 2). Toạ độ trung điểm M của AB là M((1+3)/2; (2+0)/2; (-1+2)/2) = M(2; 1; 1/2)."]',
        ImportantNotesJson = N'["Toạ độ hình chiếu của M(x; y; z) lên Oxy là (x; y; 0), lên Ox là (x; 0; 0)."]',
        SummaryPointsJson = N'["Hệ toạ độ Oxyz biến các bài toán chứng minh hình học không gian phức tạp thành các phép toán đại số cơ bản."]',
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'les_math12_c2_b2';
END

IF NOT EXISTS (SELECT 1 FROM content_lessons WHERE Id = 'les_math12_c2_b3')
BEGIN
    INSERT INTO content_lessons (
        Id, ChapterId, TopicId, Title, Slug, OrderIndex, Status, AuthorId,
        LearningObjectivesJson, Introduction, DefinitionsJson, FormulasJson, ExamplesJson, ImportantNotesJson, SummaryPointsJson,
        CreatedAt, UpdatedAt
    )
    VALUES (
        'les_math12_c2_b3', 'chp_math12_c2', N'top_math12_c2_t2', N'Bài 8: Biểu thức toạ độ của các phép toán vectơ', 'bieu-thuc-toa-do-phep-toan-vecto', 3, 'published', 'usr_content_1e88ba27ab124caa9bd6c1fcdba4c99a',
        N'["Nắm vững biểu thức toạ độ của tổng, hiệu, tích vectơ với số và tích vô hướng.","Tính khoảng cách giữa 2 điểm và góc giữa 2 vectơ."]', N'Biểu thức toạ độ đại số hóa các phép toán hình học vectơ, cho phép tính toán độ dài, tích vô hướng và xét tính vuông góc trực tiếp qua các phép tính số học.', N'["Tích vô hướng: Cho u = (x1; y1; z1) và v = (x2; y2; z2), khi đó u.v = x1.x2 + y1.y2 + z1.z2."]', N'["|\\vec{u}| = \\sqrt{x^2 + y^2 + z^2}","\\cos(\\vec{u}, \\vec{v}) = \\frac{\\vec{u} \\cdot \\vec{v}}{|\\vec{u}| \\cdot |\\vec{v}|} = \\frac{x_1 x_2 + y_1 y_2 + z_1 z_2}{\\sqrt{x_1^2 + y_1^2 + z_1^2} \\cdot \\sqrt{x_2^2 + y_2^2 + z_2^2}}","AB = \\sqrt{(x_B - x_A)^2 + (y_B - y_A)^2 + (z_B - z_A)^2}"]', N'["Ví dụ: Cho u = (1; -2; 2) và v = (2; 1; 0). Tính u.v = 1*2 + (-2)*1 + 2*0 = 0 => hai vectơ vuông góc nhau."]', N'["Hai vectơ vuông góc khi và chỉ khi tích vô hướng bằng 0: x1.x2 + y1.y2 + z1.z2 = 0."]', N'["Các phép toán toạ độ vectơ là nền tảng để viết phương trình mặt phẳng, đường thẳng và mặt cầu trong chương 5."]',
        SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lessons
    SET ChapterId = 'chp_math12_c2',
        TopicId = N'top_math12_c2_t2',
        Title = N'Bài 8: Biểu thức toạ độ của các phép toán vectơ',
        Slug = 'bieu-thuc-toa-do-phep-toan-vecto',
        OrderIndex = 3,
        Status = 'published',
        LearningObjectivesJson = N'["Nắm vững biểu thức toạ độ của tổng, hiệu, tích vectơ với số và tích vô hướng.","Tính khoảng cách giữa 2 điểm và góc giữa 2 vectơ."]',
        Introduction = N'Biểu thức toạ độ đại số hóa các phép toán hình học vectơ, cho phép tính toán độ dài, tích vô hướng và xét tính vuông góc trực tiếp qua các phép tính số học.',
        DefinitionsJson = N'["Tích vô hướng: Cho u = (x1; y1; z1) và v = (x2; y2; z2), khi đó u.v = x1.x2 + y1.y2 + z1.z2."]',
        FormulasJson = N'["|\\vec{u}| = \\sqrt{x^2 + y^2 + z^2}","\\cos(\\vec{u}, \\vec{v}) = \\frac{\\vec{u} \\cdot \\vec{v}}{|\\vec{u}| \\cdot |\\vec{v}|} = \\frac{x_1 x_2 + y_1 y_2 + z_1 z_2}{\\sqrt{x_1^2 + y_1^2 + z_1^2} \\cdot \\sqrt{x_2^2 + y_2^2 + z_2^2}}","AB = \\sqrt{(x_B - x_A)^2 + (y_B - y_A)^2 + (z_B - z_A)^2}"]',
        ExamplesJson = N'["Ví dụ: Cho u = (1; -2; 2) và v = (2; 1; 0). Tính u.v = 1*2 + (-2)*1 + 2*0 = 0 => hai vectơ vuông góc nhau."]',
        ImportantNotesJson = N'["Hai vectơ vuông góc khi và chỉ khi tích vô hướng bằng 0: x1.x2 + y1.y2 + z1.z2 = 0."]',
        SummaryPointsJson = N'["Các phép toán toạ độ vectơ là nền tảng để viết phương trình mặt phẳng, đường thẳng và mặt cầu trong chương 5."]',
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'les_math12_c2_b3';
END

IF NOT EXISTS (SELECT 1 FROM content_lessons WHERE Id = 'les_math12_c3_b1')
BEGIN
    INSERT INTO content_lessons (
        Id, ChapterId, TopicId, Title, Slug, OrderIndex, Status, AuthorId,
        LearningObjectivesJson, Introduction, DefinitionsJson, FormulasJson, ExamplesJson, ImportantNotesJson, SummaryPointsJson,
        CreatedAt, UpdatedAt
    )
    VALUES (
        'les_math12_c3_b1', 'chp_math12_c3', N'top_math12_c3_t1', N'Bài 9: Khoảng biến thiên và khoảng tứ phân vị', 'khoang-bien-thien-va-khoang-tu-phan-vi', 1, 'published', 'usr_content_1e88ba27ab124caa9bd6c1fcdba4c99a',
        N'["Hiểu ý nghĩa của khoảng biến thiên và khoảng tứ phân vị trong mẫu ghép nhóm.","Thành thạo công thức tính tứ phân vị Q1, Q2, Q3 từ bảng tần số ghép nhóm."]', N'Trong thực tế khi số liệu lớn, người ta chia số liệu thành các nhóm khoảng. Khoảng biến thiên và khoảng tứ phân vị đo lường độ phân tán và phát hiện giá trị bất thường.', N'["Khoảng biến thiên: R = x_max - x_min của các khoảng nhóm.","Khoảng tứ phân vị: Delta_Q = Q_3 - Q_1, đo độ phân tán của 50% số liệu chính giữa."]', N'["Q_r = u_m + \\frac{\\frac{r \\cdot n}{4} - C}{n_m} \\cdot (u_{m+1} - u_m) \\quad (r = 1, 2, 3)"]', N'["Ví dụ: Khảo sát thời gian tự học của 100 học sinh. Lập bảng tần số ghép nhóm và tính Q1, Q3, từ đó suy ra khoảng tứ phân vị."]', N'["Khoảng tứ phân vị ít bị ảnh hưởng bởi các giá trị bất thường (ngoại lai) hơn khoảng biến thiên."]', N'["Khoảng biến thiên và khoảng tứ phân vị là hai số đặc trưng cơ bản đánh giá độ đồng đều của mẫu số liệu."]',
        SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lessons
    SET ChapterId = 'chp_math12_c3',
        TopicId = N'top_math12_c3_t1',
        Title = N'Bài 9: Khoảng biến thiên và khoảng tứ phân vị',
        Slug = 'khoang-bien-thien-va-khoang-tu-phan-vi',
        OrderIndex = 1,
        Status = 'published',
        LearningObjectivesJson = N'["Hiểu ý nghĩa của khoảng biến thiên và khoảng tứ phân vị trong mẫu ghép nhóm.","Thành thạo công thức tính tứ phân vị Q1, Q2, Q3 từ bảng tần số ghép nhóm."]',
        Introduction = N'Trong thực tế khi số liệu lớn, người ta chia số liệu thành các nhóm khoảng. Khoảng biến thiên và khoảng tứ phân vị đo lường độ phân tán và phát hiện giá trị bất thường.',
        DefinitionsJson = N'["Khoảng biến thiên: R = x_max - x_min của các khoảng nhóm.","Khoảng tứ phân vị: Delta_Q = Q_3 - Q_1, đo độ phân tán của 50% số liệu chính giữa."]',
        FormulasJson = N'["Q_r = u_m + \\frac{\\frac{r \\cdot n}{4} - C}{n_m} \\cdot (u_{m+1} - u_m) \\quad (r = 1, 2, 3)"]',
        ExamplesJson = N'["Ví dụ: Khảo sát thời gian tự học của 100 học sinh. Lập bảng tần số ghép nhóm và tính Q1, Q3, từ đó suy ra khoảng tứ phân vị."]',
        ImportantNotesJson = N'["Khoảng tứ phân vị ít bị ảnh hưởng bởi các giá trị bất thường (ngoại lai) hơn khoảng biến thiên."]',
        SummaryPointsJson = N'["Khoảng biến thiên và khoảng tứ phân vị là hai số đặc trưng cơ bản đánh giá độ đồng đều của mẫu số liệu."]',
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'les_math12_c3_b1';
END

IF NOT EXISTS (SELECT 1 FROM content_lessons WHERE Id = 'les_math12_c3_b2')
BEGIN
    INSERT INTO content_lessons (
        Id, ChapterId, TopicId, Title, Slug, OrderIndex, Status, AuthorId,
        LearningObjectivesJson, Introduction, DefinitionsJson, FormulasJson, ExamplesJson, ImportantNotesJson, SummaryPointsJson,
        CreatedAt, UpdatedAt
    )
    VALUES (
        'les_math12_c3_b2', 'chp_math12_c3', N'top_math12_c3_t2', N'Bài 10: Phương sai và độ lệch chuẩn của mẫu số liệu ghép nhóm', 'phuong-sai-va-do-lech-chuan', 2, 'published', 'usr_content_1e88ba27ab124caa9bd6c1fcdba4c99a',
        N'["Hiểu ý nghĩa của phương sai và độ lệch chuẩn trong đánh giá độ rủi ro, ổn định.","Thành thạo công thức và kỹ năng bấm máy tính cầm tay tìm phương sai s^2 và độ lệch chuẩn s."]', N'Phương sai và độ lệch chuẩn là các chỉ số thống kê quan trọng nhất phản ánh độ phân tán của các giá trị quan sát xung quanh giá trị trung bình.', N'["Giá trị đại diện: c_i = (a_i + a_{i+1})/2 là trung điểm của nửa khoảng ghép nhóm.","Phương sai s^2: Trung bình cộng bình phương độ lệch của các giá trị đại diện so với số trung bình."]', N'["\\bar{x} = \\frac{1}{n} \\sum_{i=1}^k n_i c_i","s^2 = \\frac{1}{n} \\sum_{i=1}^k n_i c_i^2 - (\\bar{x})^2","s = \\sqrt{s^2}"]', N'["Ví dụ: So sánh độ ổn định năng suất lúa giữa hai giống cây dựa vào độ lệch chuẩn: giống nào có s nhỏ hơn thì năng suất đồng đều hơn."]', N'["Độ lệch chuẩn có cùng đơn vị đo với đại lượng nghiên cứu, giúp so sánh trực quan."]', N'["Phương sai và độ lệch chuẩn càng nhỏ thì số liệu càng tập trung quanh giá trị trung bình."]',
        SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lessons
    SET ChapterId = 'chp_math12_c3',
        TopicId = N'top_math12_c3_t2',
        Title = N'Bài 10: Phương sai và độ lệch chuẩn của mẫu số liệu ghép nhóm',
        Slug = 'phuong-sai-va-do-lech-chuan',
        OrderIndex = 2,
        Status = 'published',
        LearningObjectivesJson = N'["Hiểu ý nghĩa của phương sai và độ lệch chuẩn trong đánh giá độ rủi ro, ổn định.","Thành thạo công thức và kỹ năng bấm máy tính cầm tay tìm phương sai s^2 và độ lệch chuẩn s."]',
        Introduction = N'Phương sai và độ lệch chuẩn là các chỉ số thống kê quan trọng nhất phản ánh độ phân tán của các giá trị quan sát xung quanh giá trị trung bình.',
        DefinitionsJson = N'["Giá trị đại diện: c_i = (a_i + a_{i+1})/2 là trung điểm của nửa khoảng ghép nhóm.","Phương sai s^2: Trung bình cộng bình phương độ lệch của các giá trị đại diện so với số trung bình."]',
        FormulasJson = N'["\\bar{x} = \\frac{1}{n} \\sum_{i=1}^k n_i c_i","s^2 = \\frac{1}{n} \\sum_{i=1}^k n_i c_i^2 - (\\bar{x})^2","s = \\sqrt{s^2}"]',
        ExamplesJson = N'["Ví dụ: So sánh độ ổn định năng suất lúa giữa hai giống cây dựa vào độ lệch chuẩn: giống nào có s nhỏ hơn thì năng suất đồng đều hơn."]',
        ImportantNotesJson = N'["Độ lệch chuẩn có cùng đơn vị đo với đại lượng nghiên cứu, giúp so sánh trực quan."]',
        SummaryPointsJson = N'["Phương sai và độ lệch chuẩn càng nhỏ thì số liệu càng tập trung quanh giá trị trung bình."]',
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'les_math12_c3_b2';
END

IF NOT EXISTS (SELECT 1 FROM content_lessons WHERE Id = 'les_math12_c4_b1')
BEGIN
    INSERT INTO content_lessons (
        Id, ChapterId, TopicId, Title, Slug, OrderIndex, Status, AuthorId,
        LearningObjectivesJson, Introduction, DefinitionsJson, FormulasJson, ExamplesJson, ImportantNotesJson, SummaryPointsJson,
        CreatedAt, UpdatedAt
    )
    VALUES (
        'les_math12_c4_b1', 'chp_math12_c4', N'top_math12_c4_t1', N'Bài 11: Nguyên hàm', 'nguyen-ham', 1, 'published', 'usr_content_1e88ba27ab124caa9bd6c1fcdba4c99a',
        N'["Nắm vững định nghĩa nguyên hàm và các tính chất cơ bản.","Thuộc bảng nguyên hàm của các hàm số sơ cấp cơ bản.","Áp dụng phương pháp đổi biến số và từng phần."]', N'Nguyên hàm là phép toán ngược của đạo hàm. Nếu biết tốc độ biến thiên, nguyên hàm cho phép ta tìm lại hàm số gốc ban đầu.', N'["Hàm F(x) là nguyên hàm của f(x) trên K nếu F''(x) = f(x) với mọi x thuộc K.","Họ nguyên hàm: \\int f(x) dx = F(x) + C."]', N'["\\int x^\\alpha dx = \\frac{x^{\\alpha + 1}}{\\alpha + 1} + C \\quad (\\alpha \\ne -1)","\\int \\frac{1}{x} dx = \\ln|x| + C, \\quad \\int e^x dx = e^x + C","\\int u \\, dv = u v - \\int v \\, du"]', N'["Ví dụ: Tìm nguyên hàm I = \\int x e^x dx: Đặt u = x => du = dx; dv = e^x dx => v = e^x. Suy ra I = x e^x - \\int e^x dx = (x - 1)e^x + C."]', N'["Đừng quên cộng hằng số C trong kết quả họ nguyên hàm."]', N'["Hai phương pháp trụ cột tính nguyên hàm: 1) Đổi biến số u = u(x); 2) Từng phần theo quy tắc \"nhất lô, nhì đa, tam lượng, tứ mũ\"."]',
        SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lessons
    SET ChapterId = 'chp_math12_c4',
        TopicId = N'top_math12_c4_t1',
        Title = N'Bài 11: Nguyên hàm',
        Slug = 'nguyen-ham',
        OrderIndex = 1,
        Status = 'published',
        LearningObjectivesJson = N'["Nắm vững định nghĩa nguyên hàm và các tính chất cơ bản.","Thuộc bảng nguyên hàm của các hàm số sơ cấp cơ bản.","Áp dụng phương pháp đổi biến số và từng phần."]',
        Introduction = N'Nguyên hàm là phép toán ngược của đạo hàm. Nếu biết tốc độ biến thiên, nguyên hàm cho phép ta tìm lại hàm số gốc ban đầu.',
        DefinitionsJson = N'["Hàm F(x) là nguyên hàm của f(x) trên K nếu F''(x) = f(x) với mọi x thuộc K.","Họ nguyên hàm: \\int f(x) dx = F(x) + C."]',
        FormulasJson = N'["\\int x^\\alpha dx = \\frac{x^{\\alpha + 1}}{\\alpha + 1} + C \\quad (\\alpha \\ne -1)","\\int \\frac{1}{x} dx = \\ln|x| + C, \\quad \\int e^x dx = e^x + C","\\int u \\, dv = u v - \\int v \\, du"]',
        ExamplesJson = N'["Ví dụ: Tìm nguyên hàm I = \\int x e^x dx: Đặt u = x => du = dx; dv = e^x dx => v = e^x. Suy ra I = x e^x - \\int e^x dx = (x - 1)e^x + C."]',
        ImportantNotesJson = N'["Đừng quên cộng hằng số C trong kết quả họ nguyên hàm."]',
        SummaryPointsJson = N'["Hai phương pháp trụ cột tính nguyên hàm: 1) Đổi biến số u = u(x); 2) Từng phần theo quy tắc \"nhất lô, nhì đa, tam lượng, tứ mũ\"."]',
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'les_math12_c4_b1';
END

IF NOT EXISTS (SELECT 1 FROM content_lessons WHERE Id = 'les_math12_c4_b2')
BEGIN
    INSERT INTO content_lessons (
        Id, ChapterId, TopicId, Title, Slug, OrderIndex, Status, AuthorId,
        LearningObjectivesJson, Introduction, DefinitionsJson, FormulasJson, ExamplesJson, ImportantNotesJson, SummaryPointsJson,
        CreatedAt, UpdatedAt
    )
    VALUES (
        'les_math12_c4_b2', 'chp_math12_c4', N'top_math12_c4_t1', N'Bài 12: Tích phân', 'tich-phan', 2, 'published', 'usr_content_1e88ba27ab124caa9bd6c1fcdba4c99a',
        N'["Hiểu bản chất định nghĩa tích phân theo công thức Newton-Leibniz.","Nắm vững các tính chất cơ bản của tích phân xác định.","Thành thạo phương pháp đổi biến số (có đổi cận) và tích phân từng phần."]', N'Tích phân xác định là công cụ mạnh mẽ trong giải tích, liên kết giá trị nguyên hàm tại hai đầu mút để tính toán diện tích, thể tích và công trong vật lý.', N'["Định nghĩa: \\int_a^b f(x) dx = F(b) - F(a) = F(x)|_a^b."]', N'["\\int_a^b f(x) dx = F(b) - F(a)","\\int_a^b [f(x) \\pm g(x)] dx = \\int_a^b f(x) dx \\pm \\int_a^b g(x) dx","\\int_a^b f(x) dx = \\int_a^c f(x) dx + \\int_c^b f(x) dx","\\int_a^b u \\, dv = (u v)|_a^b - \\int_a^b v \\, du"]', N'["Ví dụ: Tính I = \\int_0^1 (2x + 1) dx = (x^2 + x)|_0^1 = (1 + 1) - (0) = 2."]', N'["Khi đổi biến t = u(x) trong tích phân xác định, BẮT BUỘC phải đổi cận tương ứng."]', N'["Tích phân không phụ thuộc vào biến số: \\int_a^b f(x) dx = \\int_a^b f(t) dt."]',
        SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lessons
    SET ChapterId = 'chp_math12_c4',
        TopicId = N'top_math12_c4_t1',
        Title = N'Bài 12: Tích phân',
        Slug = 'tich-phan',
        OrderIndex = 2,
        Status = 'published',
        LearningObjectivesJson = N'["Hiểu bản chất định nghĩa tích phân theo công thức Newton-Leibniz.","Nắm vững các tính chất cơ bản của tích phân xác định.","Thành thạo phương pháp đổi biến số (có đổi cận) và tích phân từng phần."]',
        Introduction = N'Tích phân xác định là công cụ mạnh mẽ trong giải tích, liên kết giá trị nguyên hàm tại hai đầu mút để tính toán diện tích, thể tích và công trong vật lý.',
        DefinitionsJson = N'["Định nghĩa: \\int_a^b f(x) dx = F(b) - F(a) = F(x)|_a^b."]',
        FormulasJson = N'["\\int_a^b f(x) dx = F(b) - F(a)","\\int_a^b [f(x) \\pm g(x)] dx = \\int_a^b f(x) dx \\pm \\int_a^b g(x) dx","\\int_a^b f(x) dx = \\int_a^c f(x) dx + \\int_c^b f(x) dx","\\int_a^b u \\, dv = (u v)|_a^b - \\int_a^b v \\, du"]',
        ExamplesJson = N'["Ví dụ: Tính I = \\int_0^1 (2x + 1) dx = (x^2 + x)|_0^1 = (1 + 1) - (0) = 2."]',
        ImportantNotesJson = N'["Khi đổi biến t = u(x) trong tích phân xác định, BẮT BUỘC phải đổi cận tương ứng."]',
        SummaryPointsJson = N'["Tích phân không phụ thuộc vào biến số: \\int_a^b f(x) dx = \\int_a^b f(t) dt."]',
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'les_math12_c4_b2';
END

IF NOT EXISTS (SELECT 1 FROM content_lessons WHERE Id = 'les_math12_c4_b3')
BEGIN
    INSERT INTO content_lessons (
        Id, ChapterId, TopicId, Title, Slug, OrderIndex, Status, AuthorId,
        LearningObjectivesJson, Introduction, DefinitionsJson, FormulasJson, ExamplesJson, ImportantNotesJson, SummaryPointsJson,
        CreatedAt, UpdatedAt
    )
    VALUES (
        'les_math12_c4_b3', 'chp_math12_c4', N'top_math12_c4_t2', N'Bài 13: Ứng dụng hình học của tích phân', 'ung-dung-hinh-hoc-cua-tich-phan', 3, 'published', 'usr_content_1e88ba27ab124caa9bd6c1fcdba4c99a',
        N'["Tính diện tích hình phẳng giới hạn bởi đồ thị các hàm số.","Tính thể tích vật thể và thể tích khối tròn xoay quanh trục Ox."]', N'Ứng dụng hình học của tích phân giải quyết bài toán tính diện tích các hình có biên cong phức tạp và tính thể tích các chi tiết kỹ thuật tròn xoay.', N'["Diện tích hình phẳng: Giới hạn bởi y = f(x), y = g(x) và x = a, x = b là S = \\int_a^b |f(x) - g(x)| dx."]', N'["S = \\int_a^b |f(x) - g(x)| dx","V_x = \\pi \\int_a^b [f(x)]^2 dx \\quad (\\text{quay quanh trục Ox})","V = \\int_a^b S(x) dx \\quad (\\text{vật thể có diện tích thiết diện } S(x))"]', N'["Ví dụ: Tính thể tích khối tròn xoay tạo thành khi quay hình phẳng giới hạn bởi y = \\sqrt{x}, y = 0, x = 4 quanh Ox: V = \\pi \\int_0^4 x dx = \\pi [x^2/2]_0^4 = 8\\pi."]', N'["Cần tìm giao điểm của 2 đường cong để xác định cận tích phân nếu đề bài chưa cho sẵn a, b."]', N'["Tích phân là chìa khóa tính diện tích và thể tích hình học phi chuẩn trong thực tiễn kỹ thuật."]',
        SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lessons
    SET ChapterId = 'chp_math12_c4',
        TopicId = N'top_math12_c4_t2',
        Title = N'Bài 13: Ứng dụng hình học của tích phân',
        Slug = 'ung-dung-hinh-hoc-cua-tich-phan',
        OrderIndex = 3,
        Status = 'published',
        LearningObjectivesJson = N'["Tính diện tích hình phẳng giới hạn bởi đồ thị các hàm số.","Tính thể tích vật thể và thể tích khối tròn xoay quanh trục Ox."]',
        Introduction = N'Ứng dụng hình học của tích phân giải quyết bài toán tính diện tích các hình có biên cong phức tạp và tính thể tích các chi tiết kỹ thuật tròn xoay.',
        DefinitionsJson = N'["Diện tích hình phẳng: Giới hạn bởi y = f(x), y = g(x) và x = a, x = b là S = \\int_a^b |f(x) - g(x)| dx."]',
        FormulasJson = N'["S = \\int_a^b |f(x) - g(x)| dx","V_x = \\pi \\int_a^b [f(x)]^2 dx \\quad (\\text{quay quanh trục Ox})","V = \\int_a^b S(x) dx \\quad (\\text{vật thể có diện tích thiết diện } S(x))"]',
        ExamplesJson = N'["Ví dụ: Tính thể tích khối tròn xoay tạo thành khi quay hình phẳng giới hạn bởi y = \\sqrt{x}, y = 0, x = 4 quanh Ox: V = \\pi \\int_0^4 x dx = \\pi [x^2/2]_0^4 = 8\\pi."]',
        ImportantNotesJson = N'["Cần tìm giao điểm của 2 đường cong để xác định cận tích phân nếu đề bài chưa cho sẵn a, b."]',
        SummaryPointsJson = N'["Tích phân là chìa khóa tính diện tích và thể tích hình học phi chuẩn trong thực tiễn kỹ thuật."]',
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'les_math12_c4_b3';
END

IF NOT EXISTS (SELECT 1 FROM content_lessons WHERE Id = 'les_math12_c5_b1')
BEGIN
    INSERT INTO content_lessons (
        Id, ChapterId, TopicId, Title, Slug, OrderIndex, Status, AuthorId,
        LearningObjectivesJson, Introduction, DefinitionsJson, FormulasJson, ExamplesJson, ImportantNotesJson, SummaryPointsJson,
        CreatedAt, UpdatedAt
    )
    VALUES (
        'les_math12_c5_b1', 'chp_math12_c5', N'top_math12_c5_t1', N'Bài 14: Phương trình mặt phẳng', 'phuong-trinh-mat-phang', 1, 'published', 'usr_content_1e88ba27ab124caa9bd6c1fcdba4c99a',
        N'["Nắm khái niệm vectơ pháp tuyến (VTPT) của mặt phẳng.","Viết phương trình tổng quát Ax + By + Cz + D = 0 và phương trình đoạn chắn.","Tính khoảng cách từ một điểm đến mặt phẳng."]', N'Mặt phẳng trong không gian Oxyz được xác định khi biết một điểm đi qua và một vectơ pháp tuyến vuông góc với mặt phẳng đó.', N'["Vectơ pháp tuyến: Vectơ n khác 0 có giá vuông góc với mặt phẳng (P)."]', N'["A(x - x_0) + B(y - y_0) + C(z - z_0) = 0 \\iff Ax + By + Cz + D = 0","\\frac{x}{a} + \\frac{y}{b} + \\frac{z}{c} = 1 \\quad (\\text{phương trình đoạn chắn})","d(M_0, (P)) = \\frac{|A x_0 + B y_0 + C z_0 + D|}{\\sqrt{A^2 + B^2 + C^2}}"]', N'["Ví dụ: Viết PTTQ của mặt phẳng qua M(1; -2; 3) có VTPT n = (2; -1; 4): 2(x - 1) - 1(y + 2) + 4(z - 3) = 0 <=> 2x - y + 4z - 16 = 0."]', N'["Tích có hướng của 2 vectơ không cùng phương nằm trên (P) chính là một VTPT của (P)."]', N'["Muốn viết phương trình mặt phẳng, luôn tìm 1 điểm thuộc mặt phẳng và 1 vectơ pháp tuyến."]',
        SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lessons
    SET ChapterId = 'chp_math12_c5',
        TopicId = N'top_math12_c5_t1',
        Title = N'Bài 14: Phương trình mặt phẳng',
        Slug = 'phuong-trinh-mat-phang',
        OrderIndex = 1,
        Status = 'published',
        LearningObjectivesJson = N'["Nắm khái niệm vectơ pháp tuyến (VTPT) của mặt phẳng.","Viết phương trình tổng quát Ax + By + Cz + D = 0 và phương trình đoạn chắn.","Tính khoảng cách từ một điểm đến mặt phẳng."]',
        Introduction = N'Mặt phẳng trong không gian Oxyz được xác định khi biết một điểm đi qua và một vectơ pháp tuyến vuông góc với mặt phẳng đó.',
        DefinitionsJson = N'["Vectơ pháp tuyến: Vectơ n khác 0 có giá vuông góc với mặt phẳng (P)."]',
        FormulasJson = N'["A(x - x_0) + B(y - y_0) + C(z - z_0) = 0 \\iff Ax + By + Cz + D = 0","\\frac{x}{a} + \\frac{y}{b} + \\frac{z}{c} = 1 \\quad (\\text{phương trình đoạn chắn})","d(M_0, (P)) = \\frac{|A x_0 + B y_0 + C z_0 + D|}{\\sqrt{A^2 + B^2 + C^2}}"]',
        ExamplesJson = N'["Ví dụ: Viết PTTQ của mặt phẳng qua M(1; -2; 3) có VTPT n = (2; -1; 4): 2(x - 1) - 1(y + 2) + 4(z - 3) = 0 <=> 2x - y + 4z - 16 = 0."]',
        ImportantNotesJson = N'["Tích có hướng của 2 vectơ không cùng phương nằm trên (P) chính là một VTPT của (P)."]',
        SummaryPointsJson = N'["Muốn viết phương trình mặt phẳng, luôn tìm 1 điểm thuộc mặt phẳng và 1 vectơ pháp tuyến."]',
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'les_math12_c5_b1';
END

IF NOT EXISTS (SELECT 1 FROM content_lessons WHERE Id = 'les_math12_c5_b2')
BEGIN
    INSERT INTO content_lessons (
        Id, ChapterId, TopicId, Title, Slug, OrderIndex, Status, AuthorId,
        LearningObjectivesJson, Introduction, DefinitionsJson, FormulasJson, ExamplesJson, ImportantNotesJson, SummaryPointsJson,
        CreatedAt, UpdatedAt
    )
    VALUES (
        'les_math12_c5_b2', 'chp_math12_c5', N'top_math12_c5_t1', N'Bài 15: Phương trình đường thẳng trong không gian', 'phuong-trinh-duong-thang-trong-khong-gian', 2, 'published', 'usr_content_1e88ba27ab124caa9bd6c1fcdba4c99a',
        N'["Nắm khái niệm vectơ chỉ phương (VTCP) của đường thẳng.","Viết phương trình tham số và phương trình chính tắc của đường thẳng.","Xét vị trí tương đối giữa hai đường thẳng, giữa đường thẳng và mặt phẳng."]', N'Đường thẳng trong không gian Oxyz được xác định duy nhất bởi một điểm nó đi qua và một vectơ chỉ phương chỉ định phương hướng.', N'["Vectơ chỉ phương: Vectơ u khác 0 có giá song song hoặc trùng với đường thẳng d."]', N'["\\text{PT tham số: } \\begin{cases} x = x_0 + a t \\\\ y = y_0 + b t \\\\ z = z_0 + c t \\end{cases} \\quad (t \\in \\mathbb{R})","\\text{PT chính tắc: } \\frac{x - x_0}{a} = \\frac{y - y_0}{b} = \\frac{z - z_0}{c} \\quad (abc \\ne 0)"]', N'["Ví dụ: Viết PT tham số đường thẳng d qua M(1; 2; -3) có VTCP u = (3; -1; 2): x = 1 + 3t, y = 2 - t, z = -3 + 2t."]', N'["Hai đường thẳng trong không gian có thể: cắt nhau, song song, trùng nhau hoặc chéo nhau."]', N'["Phương trình tham số giúp biểu diễn toạ độ một điểm chuyển động trên đường thẳng theo tham số thời gian t."]',
        SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lessons
    SET ChapterId = 'chp_math12_c5',
        TopicId = N'top_math12_c5_t1',
        Title = N'Bài 15: Phương trình đường thẳng trong không gian',
        Slug = 'phuong-trinh-duong-thang-trong-khong-gian',
        OrderIndex = 2,
        Status = 'published',
        LearningObjectivesJson = N'["Nắm khái niệm vectơ chỉ phương (VTCP) của đường thẳng.","Viết phương trình tham số và phương trình chính tắc của đường thẳng.","Xét vị trí tương đối giữa hai đường thẳng, giữa đường thẳng và mặt phẳng."]',
        Introduction = N'Đường thẳng trong không gian Oxyz được xác định duy nhất bởi một điểm nó đi qua và một vectơ chỉ phương chỉ định phương hướng.',
        DefinitionsJson = N'["Vectơ chỉ phương: Vectơ u khác 0 có giá song song hoặc trùng với đường thẳng d."]',
        FormulasJson = N'["\\text{PT tham số: } \\begin{cases} x = x_0 + a t \\\\ y = y_0 + b t \\\\ z = z_0 + c t \\end{cases} \\quad (t \\in \\mathbb{R})","\\text{PT chính tắc: } \\frac{x - x_0}{a} = \\frac{y - y_0}{b} = \\frac{z - z_0}{c} \\quad (abc \\ne 0)"]',
        ExamplesJson = N'["Ví dụ: Viết PT tham số đường thẳng d qua M(1; 2; -3) có VTCP u = (3; -1; 2): x = 1 + 3t, y = 2 - t, z = -3 + 2t."]',
        ImportantNotesJson = N'["Hai đường thẳng trong không gian có thể: cắt nhau, song song, trùng nhau hoặc chéo nhau."]',
        SummaryPointsJson = N'["Phương trình tham số giúp biểu diễn toạ độ một điểm chuyển động trên đường thẳng theo tham số thời gian t."]',
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'les_math12_c5_b2';
END

IF NOT EXISTS (SELECT 1 FROM content_lessons WHERE Id = 'les_math12_c5_b3')
BEGIN
    INSERT INTO content_lessons (
        Id, ChapterId, TopicId, Title, Slug, OrderIndex, Status, AuthorId,
        LearningObjectivesJson, Introduction, DefinitionsJson, FormulasJson, ExamplesJson, ImportantNotesJson, SummaryPointsJson,
        CreatedAt, UpdatedAt
    )
    VALUES (
        'les_math12_c5_b3', 'chp_math12_c5', N'top_math12_c5_t2', N'Bài 16: Công thức tính góc trong không gian', 'cong-thuc-tinh-goc-trong-khong-gian', 3, 'published', 'usr_content_1e88ba27ab124caa9bd6c1fcdba4c99a',
        N'["Tính góc giữa hai đường thẳng trong không gian Oxyz.","Tính góc giữa đường thẳng và mặt phẳng.","Tính góc giữa hai mặt phẳng."]', N'Góc trong không gian Oxyz được tính toán nhanh chóng thông qua giá trị tuyệt đối của tích vô hướng giữa các vectơ chỉ phương và vectơ pháp tuyến.', N'["Góc hình học giữa hai đường thẳng, giữa đường thẳng và mặt phẳng, giữa hai mặt phẳng luôn có số đo từ 0 đến 90 độ."]', N'["\\cos(d_1, d_2) = \\frac{|\\vec{u}_1 \\cdot \\vec{u}_2|}{|\\vec{u}_1| \\cdot |\\vec{u}_2|}","\\sin(d, (P)) = \\frac{|\\vec{u} \\cdot \\vec{n}|}{|\\vec{u}| \\cdot |\\vec{n}|}","\\cos((P), (Q)) = \\frac{|\\vec{n}_P \\cdot \\vec{n}_Q|}{|\\vec{n}_P| \\cdot |\\vec{n}_Q|}"]', N'["Ví dụ: Tính góc giữa đường thẳng d có VTCP u = (1; 0; 1) và mặt phẳng (P) có VTPT n = (1; 1; 0): sin phi = |1*1 + 0*1 + 1*0| / (sqrt(2)*sqrt(2)) = 1/2 => góc phi = 30 độ."]', N'["Lưu ý: Góc giữa đường thẳng và mặt phẳng dùng hàm SIN; góc giữa 2 đường thẳng hoặc 2 mặt phẳng dùng hàm COS."]', N'["Nhớ quy tắc: cùng loại (đường-đường, mặt-mặt) dùng cos; khác loại (đường-mặt) dùng sin."]',
        SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lessons
    SET ChapterId = 'chp_math12_c5',
        TopicId = N'top_math12_c5_t2',
        Title = N'Bài 16: Công thức tính góc trong không gian',
        Slug = 'cong-thuc-tinh-goc-trong-khong-gian',
        OrderIndex = 3,
        Status = 'published',
        LearningObjectivesJson = N'["Tính góc giữa hai đường thẳng trong không gian Oxyz.","Tính góc giữa đường thẳng và mặt phẳng.","Tính góc giữa hai mặt phẳng."]',
        Introduction = N'Góc trong không gian Oxyz được tính toán nhanh chóng thông qua giá trị tuyệt đối của tích vô hướng giữa các vectơ chỉ phương và vectơ pháp tuyến.',
        DefinitionsJson = N'["Góc hình học giữa hai đường thẳng, giữa đường thẳng và mặt phẳng, giữa hai mặt phẳng luôn có số đo từ 0 đến 90 độ."]',
        FormulasJson = N'["\\cos(d_1, d_2) = \\frac{|\\vec{u}_1 \\cdot \\vec{u}_2|}{|\\vec{u}_1| \\cdot |\\vec{u}_2|}","\\sin(d, (P)) = \\frac{|\\vec{u} \\cdot \\vec{n}|}{|\\vec{u}| \\cdot |\\vec{n}|}","\\cos((P), (Q)) = \\frac{|\\vec{n}_P \\cdot \\vec{n}_Q|}{|\\vec{n}_P| \\cdot |\\vec{n}_Q|}"]',
        ExamplesJson = N'["Ví dụ: Tính góc giữa đường thẳng d có VTCP u = (1; 0; 1) và mặt phẳng (P) có VTPT n = (1; 1; 0): sin phi = |1*1 + 0*1 + 1*0| / (sqrt(2)*sqrt(2)) = 1/2 => góc phi = 30 độ."]',
        ImportantNotesJson = N'["Lưu ý: Góc giữa đường thẳng và mặt phẳng dùng hàm SIN; góc giữa 2 đường thẳng hoặc 2 mặt phẳng dùng hàm COS."]',
        SummaryPointsJson = N'["Nhớ quy tắc: cùng loại (đường-đường, mặt-mặt) dùng cos; khác loại (đường-mặt) dùng sin."]',
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'les_math12_c5_b3';
END

IF NOT EXISTS (SELECT 1 FROM content_lessons WHERE Id = 'les_math12_c5_b4')
BEGIN
    INSERT INTO content_lessons (
        Id, ChapterId, TopicId, Title, Slug, OrderIndex, Status, AuthorId,
        LearningObjectivesJson, Introduction, DefinitionsJson, FormulasJson, ExamplesJson, ImportantNotesJson, SummaryPointsJson,
        CreatedAt, UpdatedAt
    )
    VALUES (
        'les_math12_c5_b4', 'chp_math12_c5', N'top_math12_c5_t2', N'Bài 17: Phương trình mặt cầu', 'phuong-trinh-mat-cau', 4, 'published', 'usr_content_1e88ba27ab124caa9bd6c1fcdba4c99a',
        N'["Nhận dạng phương trình chính tắc và phương trình tổng quát của mặt cầu.","Xác định tâm I và bán kính R của mặt cầu.","Xét vị trí tương đối giữa mặt cầu và mặt phẳng."]', N'Mặt cầu là tập hợp tất cả các điểm trong không gian cách đều một điểm cố định (tâm) một khoảng cách không đổi (bán kính).', N'["Mặt cầu tâm I(a; b; c) bán kính R là tập hợp các điểm M(x; y; z) thoả mãn IM = R."]', N'["(x - a)^2 + (y - b)^2 + (z - c)^2 = R^2","x^2 + y^2 + z^2 - 2ax - 2by - 2cz + d = 0 \\quad (a^2 + b^2 + c^2 - d > 0, R = \\sqrt{a^2 + b^2 + c^2 - d})"]', N'["Ví dụ: Xác định tâm và bán kính của mặt cầu (S): x^2 + y^2 + z^2 - 4x + 2y - 6z - 2 = 0: a = 2, b = -1, c = 3, d = -2. Tâm I(2; -1; 3), R = sqrt(4 + 1 + 9 - (-2)) = sqrt(16) = 4."]', N'["Mặt phẳng tiếp xúc mặt cầu (tiếp diện) khi và chỉ khi d(I, (P)) = R."]', N'["Phương trình bậc hai 3 biến là phương trình mặt cầu khi hệ số x^2, y^2, z^2 bằng nhau và a^2 + b^2 + c^2 - d > 0."]',
        SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lessons
    SET ChapterId = 'chp_math12_c5',
        TopicId = N'top_math12_c5_t2',
        Title = N'Bài 17: Phương trình mặt cầu',
        Slug = 'phuong-trinh-mat-cau',
        OrderIndex = 4,
        Status = 'published',
        LearningObjectivesJson = N'["Nhận dạng phương trình chính tắc và phương trình tổng quát của mặt cầu.","Xác định tâm I và bán kính R của mặt cầu.","Xét vị trí tương đối giữa mặt cầu và mặt phẳng."]',
        Introduction = N'Mặt cầu là tập hợp tất cả các điểm trong không gian cách đều một điểm cố định (tâm) một khoảng cách không đổi (bán kính).',
        DefinitionsJson = N'["Mặt cầu tâm I(a; b; c) bán kính R là tập hợp các điểm M(x; y; z) thoả mãn IM = R."]',
        FormulasJson = N'["(x - a)^2 + (y - b)^2 + (z - c)^2 = R^2","x^2 + y^2 + z^2 - 2ax - 2by - 2cz + d = 0 \\quad (a^2 + b^2 + c^2 - d > 0, R = \\sqrt{a^2 + b^2 + c^2 - d})"]',
        ExamplesJson = N'["Ví dụ: Xác định tâm và bán kính của mặt cầu (S): x^2 + y^2 + z^2 - 4x + 2y - 6z - 2 = 0: a = 2, b = -1, c = 3, d = -2. Tâm I(2; -1; 3), R = sqrt(4 + 1 + 9 - (-2)) = sqrt(16) = 4."]',
        ImportantNotesJson = N'["Mặt phẳng tiếp xúc mặt cầu (tiếp diện) khi và chỉ khi d(I, (P)) = R."]',
        SummaryPointsJson = N'["Phương trình bậc hai 3 biến là phương trình mặt cầu khi hệ số x^2, y^2, z^2 bằng nhau và a^2 + b^2 + c^2 - d > 0."]',
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'les_math12_c5_b4';
END

IF NOT EXISTS (SELECT 1 FROM content_lessons WHERE Id = 'les_math12_c6_b1')
BEGIN
    INSERT INTO content_lessons (
        Id, ChapterId, TopicId, Title, Slug, OrderIndex, Status, AuthorId,
        LearningObjectivesJson, Introduction, DefinitionsJson, FormulasJson, ExamplesJson, ImportantNotesJson, SummaryPointsJson,
        CreatedAt, UpdatedAt
    )
    VALUES (
        'les_math12_c6_b1', 'chp_math12_c6', N'top_math12_c6_t1', N'Bài 18: Xác suất có điều kiện', 'xac-suat-co-dieu-kien', 1, 'published', 'usr_content_1e88ba27ab124caa9bd6c1fcdba4c99a',
        N'["Hiểu rõ định nghĩa xác suất có điều kiện P(A|B).","Vận dụng công thức nhân xác suất trong tính toán biến cố phụ thuộc.","Sử dụng sơ đồ cây để biểu diễn các giai đoạn xác suất."]', N'Xác suất có điều kiện đánh giá khả năng xảy ra của một biến cố khi đã biết một biến cố liên quan khác đã xảy ra, là nền tảng của trí tuệ nhân tạo và thống kê hiện đại.', N'["Xác suất của biến cố A khi biết biến cố B đã xảy ra (P(B) > 0) là P(A|B) = P(A ∩ B) / P(B)."]', N'["P(A|B) = \\frac{P(A \\cap B)}{P(B)} \\quad (P(B) > 0)","P(A \\cap B) = P(B) \\cdot P(A|B) = P(A) \\cdot P(B|A)"]', N'["Ví dụ: Rút ngẫu nhiên 2 lá bài từ bộ 52 lá không hoàn lại. Xác suất lá thứ hai là Át khi biết lá thứ nhất là Át: P(A2|A1) = 3/51."]', N'["Nếu A và B độc lập thì P(A|B) = P(A) và P(A ∩ B) = P(A).P(B)."]', N'["Xác suất có điều kiện thu hẹp không gian mẫu ban đầu Omega về không gian mẫu mới B."]',
        SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lessons
    SET ChapterId = 'chp_math12_c6',
        TopicId = N'top_math12_c6_t1',
        Title = N'Bài 18: Xác suất có điều kiện',
        Slug = 'xac-suat-co-dieu-kien',
        OrderIndex = 1,
        Status = 'published',
        LearningObjectivesJson = N'["Hiểu rõ định nghĩa xác suất có điều kiện P(A|B).","Vận dụng công thức nhân xác suất trong tính toán biến cố phụ thuộc.","Sử dụng sơ đồ cây để biểu diễn các giai đoạn xác suất."]',
        Introduction = N'Xác suất có điều kiện đánh giá khả năng xảy ra của một biến cố khi đã biết một biến cố liên quan khác đã xảy ra, là nền tảng của trí tuệ nhân tạo và thống kê hiện đại.',
        DefinitionsJson = N'["Xác suất của biến cố A khi biết biến cố B đã xảy ra (P(B) > 0) là P(A|B) = P(A ∩ B) / P(B)."]',
        FormulasJson = N'["P(A|B) = \\frac{P(A \\cap B)}{P(B)} \\quad (P(B) > 0)","P(A \\cap B) = P(B) \\cdot P(A|B) = P(A) \\cdot P(B|A)"]',
        ExamplesJson = N'["Ví dụ: Rút ngẫu nhiên 2 lá bài từ bộ 52 lá không hoàn lại. Xác suất lá thứ hai là Át khi biết lá thứ nhất là Át: P(A2|A1) = 3/51."]',
        ImportantNotesJson = N'["Nếu A và B độc lập thì P(A|B) = P(A) và P(A ∩ B) = P(A).P(B)."]',
        SummaryPointsJson = N'["Xác suất có điều kiện thu hẹp không gian mẫu ban đầu Omega về không gian mẫu mới B."]',
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'les_math12_c6_b1';
END

IF NOT EXISTS (SELECT 1 FROM content_lessons WHERE Id = 'les_math12_c6_b2')
BEGIN
    INSERT INTO content_lessons (
        Id, ChapterId, TopicId, Title, Slug, OrderIndex, Status, AuthorId,
        LearningObjectivesJson, Introduction, DefinitionsJson, FormulasJson, ExamplesJson, ImportantNotesJson, SummaryPointsJson,
        CreatedAt, UpdatedAt
    )
    VALUES (
        'les_math12_c6_b2', 'chp_math12_c6', N'top_math12_c6_t1', N'Bài 19: Công thức xác suất toàn phần và công thức Bayes', 'cong-thuc-xac-suat-toan-phan-va-bayes', 2, 'published', 'usr_content_1e88ba27ab124caa9bd6c1fcdba4c99a',
        N'["Nắm khái niệm hệ biến cố đầy đủ.","Sử dụng công thức xác suất toàn phần để tính xác suất biến cố tổng quát.","Áp dụng công thức Bayes để cập nhật xác suất tiên triệm/hậu nghiệm trong chẩn đoán y tế, sàng lọc."]', N'Định lý Bayes cho phép đảo ngược điều kiện xác suất, là nguyên lý cốt lõi trong học máy, phân loại thư rác (Spam Filter) và chẩn đoán y khoa hiện đại.', N'["Hệ đầy đủ: Tập hợp các biến cố A1, A2, ..., An xung khắc từng đôi và có hợp bằng không gian mẫu Omega."]', N'["\\text{Xác suất toàn phần: } P(B) = \\sum_{i=1}^n P(A_i) \\cdot P(B|A_i)","\\text{Công thức Bayes: } P(A_k|B) = \\frac{P(A_k) \\cdot P(B|A_k)}{P(B)} = \\frac{P(A_k) \\cdot P(B|A_k)}{\\sum_{i=1}^n P(A_i) \\cdot P(B|A_i)}"]', N'["Ví dụ: Một xét nghiệm y tế có độ chính xác 95%. Với tỷ lệ mắc bệnh trong cộng đồng là 1%, tính xác suất một người thực sự mắc bệnh khi có kết quả xét nghiệm dương tính."]', N'["P(A) gọi là xác suất tiên nghiệm (prior); P(A|B) gọi là xác suất hậu nghiệm (posterior)."]', N'["Công thức Bayes cập nhật niềm tin vào giả thuyết A khi nhận thêm bằng chứng mới B."]',
        SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lessons
    SET ChapterId = 'chp_math12_c6',
        TopicId = N'top_math12_c6_t1',
        Title = N'Bài 19: Công thức xác suất toàn phần và công thức Bayes',
        Slug = 'cong-thuc-xac-suat-toan-phan-va-bayes',
        OrderIndex = 2,
        Status = 'published',
        LearningObjectivesJson = N'["Nắm khái niệm hệ biến cố đầy đủ.","Sử dụng công thức xác suất toàn phần để tính xác suất biến cố tổng quát.","Áp dụng công thức Bayes để cập nhật xác suất tiên triệm/hậu nghiệm trong chẩn đoán y tế, sàng lọc."]',
        Introduction = N'Định lý Bayes cho phép đảo ngược điều kiện xác suất, là nguyên lý cốt lõi trong học máy, phân loại thư rác (Spam Filter) và chẩn đoán y khoa hiện đại.',
        DefinitionsJson = N'["Hệ đầy đủ: Tập hợp các biến cố A1, A2, ..., An xung khắc từng đôi và có hợp bằng không gian mẫu Omega."]',
        FormulasJson = N'["\\text{Xác suất toàn phần: } P(B) = \\sum_{i=1}^n P(A_i) \\cdot P(B|A_i)","\\text{Công thức Bayes: } P(A_k|B) = \\frac{P(A_k) \\cdot P(B|A_k)}{P(B)} = \\frac{P(A_k) \\cdot P(B|A_k)}{\\sum_{i=1}^n P(A_i) \\cdot P(B|A_i)}"]',
        ExamplesJson = N'["Ví dụ: Một xét nghiệm y tế có độ chính xác 95%. Với tỷ lệ mắc bệnh trong cộng đồng là 1%, tính xác suất một người thực sự mắc bệnh khi có kết quả xét nghiệm dương tính."]',
        ImportantNotesJson = N'["P(A) gọi là xác suất tiên nghiệm (prior); P(A|B) gọi là xác suất hậu nghiệm (posterior)."]',
        SummaryPointsJson = N'["Công thức Bayes cập nhật niềm tin vào giả thuyết A khi nhận thêm bằng chứng mới B."]',
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'les_math12_c6_b2';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c1_b1_1')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c1_b1_1', 'les_math12_c1_b1', N'Bài 1. Tính Đơn Điệu và Cực Trị Của Hàm Số - Full (Toán 12 - Sgk Mới) || Thầy Nguyễn Phan Tiến', N'Bài giảng lý thuyết chi tiết và bài tập mẫu tính đơn điệu của hàm số chuẩn sách giáo khoa mới GDPT 2018.', 'youtube', 'https://www.youtube.com/watch?v=C64H0h3qiRc',
        'https://www.youtube-nocookie.com/embed/C64H0h3qiRc', 'C64H0h3qiRc', 'vi', 2450, 'https://i.ytimg.com/vi/C64H0h3qiRc/hqdefault.jpg', 1, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c1_b1',
        Title = N'Bài 1. Tính Đơn Điệu và Cực Trị Của Hàm Số - Full (Toán 12 - Sgk Mới) || Thầy Nguyễn Phan Tiến',
        Description = N'Bài giảng lý thuyết chi tiết và bài tập mẫu tính đơn điệu của hàm số chuẩn sách giáo khoa mới GDPT 2018.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=C64H0h3qiRc',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/C64H0h3qiRc',
        YouTubeVideoId = 'C64H0h3qiRc',
        DurationSeconds = 2450,
        ThumbnailUrl = 'https://i.ytimg.com/vi/C64H0h3qiRc/hqdefault.jpg',
        SortOrder = 1,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c1_b1_1';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c1_b1_2')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c1_b1_2', 'les_math12_c1_b1', N'TÍNH ĐƠN ĐIỆU CỦA HÀM SỐ - TOÁN 12 || Thầy Nguyễn Quốc Chí', N'Phương pháp xét tính đơn điệu, lập bảng biến thiên và các dạng bài tập thực chiến thi THPT.', 'youtube', 'https://www.youtube.com/watch?v=W_8aEs16RI0',
        'https://www.youtube-nocookie.com/embed/W_8aEs16RI0', 'W_8aEs16RI0', 'vi', 1820, 'https://i.ytimg.com/vi/W_8aEs16RI0/hqdefault.jpg', 2, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c1_b1',
        Title = N'TÍNH ĐƠN ĐIỆU CỦA HÀM SỐ - TOÁN 12 || Thầy Nguyễn Quốc Chí',
        Description = N'Phương pháp xét tính đơn điệu, lập bảng biến thiên và các dạng bài tập thực chiến thi THPT.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=W_8aEs16RI0',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/W_8aEs16RI0',
        YouTubeVideoId = 'W_8aEs16RI0',
        DurationSeconds = 1820,
        ThumbnailUrl = 'https://i.ytimg.com/vi/W_8aEs16RI0/hqdefault.jpg',
        SortOrder = 2,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c1_b1_2';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c1_b2_1')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c1_b2_1', 'les_math12_c1_b2', N'Bài 1.2 Cực Trị Của Hàm Số - Toán 12 (Sgk Mới) || Thầy Nguyễn Phan Tiến', N'Quy tắc 1 và Quy tắc 2 tìm cực trị của hàm số, các dạng bài toán chứa tham số m.', 'youtube', 'https://www.youtube.com/watch?v=BbFj2KgZy6Q',
        'https://www.youtube-nocookie.com/embed/BbFj2KgZy6Q', 'BbFj2KgZy6Q', 'vi', 2100, 'https://i.ytimg.com/vi/BbFj2KgZy6Q/hqdefault.jpg', 1, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c1_b2',
        Title = N'Bài 1.2 Cực Trị Của Hàm Số - Toán 12 (Sgk Mới) || Thầy Nguyễn Phan Tiến',
        Description = N'Quy tắc 1 và Quy tắc 2 tìm cực trị của hàm số, các dạng bài toán chứa tham số m.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=BbFj2KgZy6Q',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/BbFj2KgZy6Q',
        YouTubeVideoId = 'BbFj2KgZy6Q',
        DurationSeconds = 2100,
        ThumbnailUrl = 'https://i.ytimg.com/vi/BbFj2KgZy6Q/hqdefault.jpg',
        SortOrder = 1,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c1_b2_1';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c1_b2_2')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c1_b2_2', 'les_math12_c1_b2', N'CỰC TRỊ CỦA HÀM SỐ - TOÁN 12 || Thầy Nguyễn Quốc Chí', N'Kỹ năng tìm cực trị nhanh và phân loại các dạng toán thường xuất hiện trong đề thi.', 'youtube', 'https://www.youtube.com/watch?v=jlSW7u-Y8Ck',
        'https://www.youtube-nocookie.com/embed/jlSW7u-Y8Ck', 'jlSW7u-Y8Ck', 'vi', 1950, 'https://i.ytimg.com/vi/jlSW7u-Y8Ck/hqdefault.jpg', 2, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c1_b2',
        Title = N'CỰC TRỊ CỦA HÀM SỐ - TOÁN 12 || Thầy Nguyễn Quốc Chí',
        Description = N'Kỹ năng tìm cực trị nhanh và phân loại các dạng toán thường xuất hiện trong đề thi.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=jlSW7u-Y8Ck',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/jlSW7u-Y8Ck',
        YouTubeVideoId = 'jlSW7u-Y8Ck',
        DurationSeconds = 1950,
        ThumbnailUrl = 'https://i.ytimg.com/vi/jlSW7u-Y8Ck/hqdefault.jpg',
        SortOrder = 2,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c1_b2_2';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c1_b3_1')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c1_b3_1', 'les_math12_c1_b3', N'Bài 2. Giá Trị Lớn Nhất - Nhỏ Nhất của Hàm Số - Toán 12 (SGK Mới) || Thầy Nguyễn Phan Tiến', N'Quy trình tìm Max - Min trên đoạn, khoảng và bài toán tối ưu thực tế.', 'youtube', 'https://www.youtube.com/watch?v=WsMJEaCQsoA',
        'https://www.youtube-nocookie.com/embed/WsMJEaCQsoA', 'WsMJEaCQsoA', 'vi', 2280, 'https://i.ytimg.com/vi/WsMJEaCQsoA/hqdefault.jpg', 1, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c1_b3',
        Title = N'Bài 2. Giá Trị Lớn Nhất - Nhỏ Nhất của Hàm Số - Toán 12 (SGK Mới) || Thầy Nguyễn Phan Tiến',
        Description = N'Quy trình tìm Max - Min trên đoạn, khoảng và bài toán tối ưu thực tế.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=WsMJEaCQsoA',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/WsMJEaCQsoA',
        YouTubeVideoId = 'WsMJEaCQsoA',
        DurationSeconds = 2280,
        ThumbnailUrl = 'https://i.ytimg.com/vi/WsMJEaCQsoA/hqdefault.jpg',
        SortOrder = 1,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c1_b3_1';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c1_b3_2')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c1_b3_2', 'les_math12_c1_b3', N'Toán 12 [KNTT] - Bài 2: Giá Trị Lớn Nhất và Giá Trị Nhỏ Nhất Của Hàm Số || Thầy Khánh', N'Lý thuyết SGK Kết nối tri thức A-Z và bài toán gấp hộp carton tối ưu thể tích.', 'youtube', 'https://www.youtube.com/watch?v=bb932zpfeyk',
        'https://www.youtube-nocookie.com/embed/bb932zpfeyk', 'bb932zpfeyk', 'vi', 1740, 'https://i.ytimg.com/vi/bb932zpfeyk/hqdefault.jpg', 2, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c1_b3',
        Title = N'Toán 12 [KNTT] - Bài 2: Giá Trị Lớn Nhất và Giá Trị Nhỏ Nhất Của Hàm Số || Thầy Khánh',
        Description = N'Lý thuyết SGK Kết nối tri thức A-Z và bài toán gấp hộp carton tối ưu thể tích.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=bb932zpfeyk',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/bb932zpfeyk',
        YouTubeVideoId = 'bb932zpfeyk',
        DurationSeconds = 1740,
        ThumbnailUrl = 'https://i.ytimg.com/vi/bb932zpfeyk/hqdefault.jpg',
        SortOrder = 2,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c1_b3_2';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c1_b4_1')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c1_b4_1', 'les_math12_c1_b4', N'ĐƯỜNG TIỆM CẬN - PHẦN 1 - TOÁN 12 || Thầy Nguyễn Quốc Chí', N'Tiệm cận đứng, tiệm cận ngang và phương pháp tìm nhanh bằng máy tính cầm tay & tự luận.', 'youtube', 'https://www.youtube.com/watch?v=-b1v5R_5zc4',
        'https://www.youtube-nocookie.com/embed/-b1v5R_5zc4', '-b1v5R_5zc4', 'vi', 1650, 'https://i.ytimg.com/vi/-b1v5R_5zc4/hqdefault.jpg', 1, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c1_b4',
        Title = N'ĐƯỜNG TIỆM CẬN - PHẦN 1 - TOÁN 12 || Thầy Nguyễn Quốc Chí',
        Description = N'Tiệm cận đứng, tiệm cận ngang và phương pháp tìm nhanh bằng máy tính cầm tay & tự luận.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=-b1v5R_5zc4',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/-b1v5R_5zc4',
        YouTubeVideoId = '-b1v5R_5zc4',
        DurationSeconds = 1650,
        ThumbnailUrl = 'https://i.ytimg.com/vi/-b1v5R_5zc4/hqdefault.jpg',
        SortOrder = 1,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c1_b4_1';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c1_b5_1')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c1_b5_1', 'les_math12_c1_b5', N'KHẢO SÁT SỰ BIẾN THIÊN VÀ VẼ ĐỒ THỊ HÀM SỐ - TOÁN 12 || Thầy Nguyễn Quốc Chí', N'Khảo sát hàm bậc 3, phân thức bậc nhất trên bậc nhất và bậc hai trên bậc nhất.', 'youtube', 'https://www.youtube.com/watch?v=eBzEKfN8OfI',
        'https://www.youtube-nocookie.com/embed/eBzEKfN8OfI', 'eBzEKfN8OfI', 'vi', 2340, 'https://i.ytimg.com/vi/eBzEKfN8OfI/hqdefault.jpg', 1, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c1_b5',
        Title = N'KHẢO SÁT SỰ BIẾN THIÊN VÀ VẼ ĐỒ THỊ HÀM SỐ - TOÁN 12 || Thầy Nguyễn Quốc Chí',
        Description = N'Khảo sát hàm bậc 3, phân thức bậc nhất trên bậc nhất và bậc hai trên bậc nhất.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=eBzEKfN8OfI',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/eBzEKfN8OfI',
        YouTubeVideoId = 'eBzEKfN8OfI',
        DurationSeconds = 2340,
        ThumbnailUrl = 'https://i.ytimg.com/vi/eBzEKfN8OfI/hqdefault.jpg',
        SortOrder = 1,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c1_b5_1';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c1_b5_2')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c1_b5_2', 'les_math12_c1_b5', N'Bài 5. Ứng Dụng Đạo Hàm Giải Quyết Bài Toán Thực Tế || Thầy Nguyễn Phan Tiến', N'Bài toán kinh tế, chi phí sản xuất và tối ưu hoá hình học không gian.', 'youtube', 'https://www.youtube.com/watch?v=DYFeDU9oFG4',
        'https://www.youtube-nocookie.com/embed/DYFeDU9oFG4', 'DYFeDU9oFG4', 'vi', 2150, 'https://i.ytimg.com/vi/DYFeDU9oFG4/hqdefault.jpg', 2, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c1_b5',
        Title = N'Bài 5. Ứng Dụng Đạo Hàm Giải Quyết Bài Toán Thực Tế || Thầy Nguyễn Phan Tiến',
        Description = N'Bài toán kinh tế, chi phí sản xuất và tối ưu hoá hình học không gian.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=DYFeDU9oFG4',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/DYFeDU9oFG4',
        YouTubeVideoId = 'DYFeDU9oFG4',
        DurationSeconds = 2150,
        ThumbnailUrl = 'https://i.ytimg.com/vi/DYFeDU9oFG4/hqdefault.jpg',
        SortOrder = 2,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c1_b5_2';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c2_b1_1')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c2_b1_1', 'les_math12_c2_b1', N'Toán 12 - Bài 6 - VECTƠ TRONG KHÔNG GIAN || Thầy An', N'Khái niệm vectơ 3 chiều, quy tắc hình hộp và chứng minh đẳng thức vectơ.', 'youtube', 'https://www.youtube.com/watch?v=giBSwP7R0sE',
        'https://www.youtube-nocookie.com/embed/giBSwP7R0sE', 'giBSwP7R0sE', 'vi', 1890, 'https://i.ytimg.com/vi/giBSwP7R0sE/hqdefault.jpg', 1, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c2_b1',
        Title = N'Toán 12 - Bài 6 - VECTƠ TRONG KHÔNG GIAN || Thầy An',
        Description = N'Khái niệm vectơ 3 chiều, quy tắc hình hộp và chứng minh đẳng thức vectơ.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=giBSwP7R0sE',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/giBSwP7R0sE',
        YouTubeVideoId = 'giBSwP7R0sE',
        DurationSeconds = 1890,
        ThumbnailUrl = 'https://i.ytimg.com/vi/giBSwP7R0sE/hqdefault.jpg',
        SortOrder = 1,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c2_b1_1';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c2_b2_1')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c2_b2_1', 'les_math12_c2_b2', N'Toán 12 Bài 7: Hệ trục toạ độ trong không gian - Kết nối tri thức || VietJack', N'Xác định toạ độ điểm và toạ độ vectơ trên hệ trục toạ độ vuông góc Oxyz.', 'youtube', 'https://www.youtube.com/watch?v=RT-Uy7InSxE',
        'https://www.youtube-nocookie.com/embed/RT-Uy7InSxE', 'RT-Uy7InSxE', 'vi', 1720, 'https://i.ytimg.com/vi/RT-Uy7InSxE/hqdefault.jpg', 1, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c2_b2',
        Title = N'Toán 12 Bài 7: Hệ trục toạ độ trong không gian - Kết nối tri thức || VietJack',
        Description = N'Xác định toạ độ điểm và toạ độ vectơ trên hệ trục toạ độ vuông góc Oxyz.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=RT-Uy7InSxE',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/RT-Uy7InSxE',
        YouTubeVideoId = 'RT-Uy7InSxE',
        DurationSeconds = 1720,
        ThumbnailUrl = 'https://i.ytimg.com/vi/RT-Uy7InSxE/hqdefault.jpg',
        SortOrder = 1,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c2_b2_1';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c2_b3_1')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c2_b3_1', 'les_math12_c2_b3', N'TOÁN 12 - KNTT - BÀI 8 - BIỂU THỨC TỌA ĐỘ CỦA CÁC PHÉP TOÁN VECTƠ || Thầy Lâm 1E', N'Phép cộng trừ, nhân với số, tích vô hướng và tính góc giữa 2 vectơ.', 'youtube', 'https://www.youtube.com/watch?v=qVe34jxIHIU',
        'https://www.youtube-nocookie.com/embed/qVe34jxIHIU', 'qVe34jxIHIU', 'vi', 1980, 'https://i.ytimg.com/vi/qVe34jxIHIU/hqdefault.jpg', 1, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c2_b3',
        Title = N'TOÁN 12 - KNTT - BÀI 8 - BIỂU THỨC TỌA ĐỘ CỦA CÁC PHÉP TOÁN VECTƠ || Thầy Lâm 1E',
        Description = N'Phép cộng trừ, nhân với số, tích vô hướng và tính góc giữa 2 vectơ.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=qVe34jxIHIU',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/qVe34jxIHIU',
        YouTubeVideoId = 'qVe34jxIHIU',
        DurationSeconds = 1980,
        ThumbnailUrl = 'https://i.ytimg.com/vi/qVe34jxIHIU/hqdefault.jpg',
        SortOrder = 1,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c2_b3_1';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c3_b1_1')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c3_b1_1', 'les_math12_c3_b1', N'KHOẢNG TỨ PHÂN VỊ - TOÁN 12 - MẪU SỐ LIỆU GHÉP NHÓM || Thầy Nguyễn Quốc Chí', N'Cách xác định nhóm chứa tứ phân vị và công thức tính chính xác Q1, Q2, Q3.', 'youtube', 'https://www.youtube.com/watch?v=pXYgEAA-uaQ',
        'https://www.youtube-nocookie.com/embed/pXYgEAA-uaQ', 'pXYgEAA-uaQ', 'vi', 1860, 'https://i.ytimg.com/vi/pXYgEAA-uaQ/hqdefault.jpg', 1, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c3_b1',
        Title = N'KHOẢNG TỨ PHÂN VỊ - TOÁN 12 - MẪU SỐ LIỆU GHÉP NHÓM || Thầy Nguyễn Quốc Chí',
        Description = N'Cách xác định nhóm chứa tứ phân vị và công thức tính chính xác Q1, Q2, Q3.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=pXYgEAA-uaQ',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/pXYgEAA-uaQ',
        YouTubeVideoId = 'pXYgEAA-uaQ',
        DurationSeconds = 1860,
        ThumbnailUrl = 'https://i.ytimg.com/vi/pXYgEAA-uaQ/hqdefault.jpg',
        SortOrder = 1,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c3_b1_1';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c3_b1_2')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c3_b1_2', 'les_math12_c3_b1', N'[LỚP 12] TẤT TẦN TẬT: MẪU SỐ LIỆU GHÉP NHÓM || Thầy Lê Ngọc Sơn', N'Hệ thống hóa toàn bộ kiến thức thống kê mẫu số liệu ghép nhóm GDPT 2018.', 'youtube', 'https://www.youtube.com/watch?v=B832Khhl_rw',
        'https://www.youtube-nocookie.com/embed/B832Khhl_rw', 'B832Khhl_rw', 'vi', 2100, 'https://i.ytimg.com/vi/B832Khhl_rw/hqdefault.jpg', 2, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c3_b1',
        Title = N'[LỚP 12] TẤT TẦN TẬT: MẪU SỐ LIỆU GHÉP NHÓM || Thầy Lê Ngọc Sơn',
        Description = N'Hệ thống hóa toàn bộ kiến thức thống kê mẫu số liệu ghép nhóm GDPT 2018.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=B832Khhl_rw',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/B832Khhl_rw',
        YouTubeVideoId = 'B832Khhl_rw',
        DurationSeconds = 2100,
        ThumbnailUrl = 'https://i.ytimg.com/vi/B832Khhl_rw/hqdefault.jpg',
        SortOrder = 2,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c3_b1_2';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c3_b2_1')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c3_b2_1', 'les_math12_c3_b2', N'PHƯƠNG SAI VÀ ĐỘ LỆCH CHUẨN - TOÁN 12 - MẪU GHÉP NHÓM || Thầy Nguyễn Quốc Chí', N'Công thức tính phương sai s^2, độ lệch chuẩn s và mẹo bấm máy tính Casio cầm tay.', 'youtube', 'https://www.youtube.com/watch?v=FNu3w17oeaI',
        'https://www.youtube-nocookie.com/embed/FNu3w17oeaI', 'FNu3w17oeaI', 'vi', 1650, 'https://i.ytimg.com/vi/FNu3w17oeaI/hqdefault.jpg', 1, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c3_b2',
        Title = N'PHƯƠNG SAI VÀ ĐỘ LỆCH CHUẨN - TOÁN 12 - MẪU GHÉP NHÓM || Thầy Nguyễn Quốc Chí',
        Description = N'Công thức tính phương sai s^2, độ lệch chuẩn s và mẹo bấm máy tính Casio cầm tay.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=FNu3w17oeaI',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/FNu3w17oeaI',
        YouTubeVideoId = 'FNu3w17oeaI',
        DurationSeconds = 1650,
        ThumbnailUrl = 'https://i.ytimg.com/vi/FNu3w17oeaI/hqdefault.jpg',
        SortOrder = 1,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c3_b2_1';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c3_b2_2')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c3_b2_2', 'les_math12_c3_b2', N'Toán học lớp 12 - Kết nối tri thức - Bài 10 - Phương sai và độ lệch chuẩn || Thầy Quang', N'Giải chi tiết các bài tập thực hành trong SGK Toán 12 Kết nối tri thức.', 'youtube', 'https://www.youtube.com/watch?v=zb-tMqK2hV8',
        'https://www.youtube-nocookie.com/embed/zb-tMqK2hV8', 'zb-tMqK2hV8', 'vi', 1920, 'https://i.ytimg.com/vi/zb-tMqK2hV8/hqdefault.jpg', 2, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c3_b2',
        Title = N'Toán học lớp 12 - Kết nối tri thức - Bài 10 - Phương sai và độ lệch chuẩn || Thầy Quang',
        Description = N'Giải chi tiết các bài tập thực hành trong SGK Toán 12 Kết nối tri thức.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=zb-tMqK2hV8',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/zb-tMqK2hV8',
        YouTubeVideoId = 'zb-tMqK2hV8',
        DurationSeconds = 1920,
        ThumbnailUrl = 'https://i.ytimg.com/vi/zb-tMqK2hV8/hqdefault.jpg',
        SortOrder = 2,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c3_b2_2';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c4_b1_1')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c4_b1_1', 'les_math12_c4_b1', N'Toán 12 Bài 11: Nguyên hàm | Kết nối tri thức || VietJack THPT Official', N'Khái niệm nguyên hàm, bảng nguyên hàm cơ bản và các phương pháp tính nhanh.', 'youtube', 'https://www.youtube.com/watch?v=lpy2wxi1STY',
        'https://www.youtube-nocookie.com/embed/lpy2wxi1STY', 'lpy2wxi1STY', 'vi', 2180, 'https://i.ytimg.com/vi/lpy2wxi1STY/hqdefault.jpg', 1, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c4_b1',
        Title = N'Toán 12 Bài 11: Nguyên hàm | Kết nối tri thức || VietJack THPT Official',
        Description = N'Khái niệm nguyên hàm, bảng nguyên hàm cơ bản và các phương pháp tính nhanh.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=lpy2wxi1STY',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/lpy2wxi1STY',
        YouTubeVideoId = 'lpy2wxi1STY',
        DurationSeconds = 2180,
        ThumbnailUrl = 'https://i.ytimg.com/vi/lpy2wxi1STY/hqdefault.jpg',
        SortOrder = 1,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c4_b1_1';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c4_b1_2')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c4_b1_2', 'les_math12_c4_b1', N'Bài 1.1 Nguyên Hàm Cơ Bản và Công Thức Nguyên Hàm (Toán 12) || Thầy Nguyễn Phan Tiến', N'Chuyên đề nguyên hàm từng phần và nguyên hàm đổi biến số.', 'youtube', 'https://www.youtube.com/watch?v=j615s9znk4U',
        'https://www.youtube-nocookie.com/embed/j615s9znk4U', 'j615s9znk4U', 'vi', 2450, 'https://i.ytimg.com/vi/j615s9znk4U/hqdefault.jpg', 2, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c4_b1',
        Title = N'Bài 1.1 Nguyên Hàm Cơ Bản và Công Thức Nguyên Hàm (Toán 12) || Thầy Nguyễn Phan Tiến',
        Description = N'Chuyên đề nguyên hàm từng phần và nguyên hàm đổi biến số.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=j615s9znk4U',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/j615s9znk4U',
        YouTubeVideoId = 'j615s9znk4U',
        DurationSeconds = 2450,
        ThumbnailUrl = 'https://i.ytimg.com/vi/j615s9znk4U/hqdefault.jpg',
        SortOrder = 2,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c4_b1_2';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c4_b2_1')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c4_b2_1', 'les_math12_c4_b2', N'Toán 12 Bài 12: Tích phân | Kết nối tri thức || VietJack THPT Official', N'Định nghĩa Newton-Leibniz, các tính chất tích phân xác định và bài tập vận dụng.', 'youtube', 'https://www.youtube.com/watch?v=VRcmLOWbESw',
        'https://www.youtube-nocookie.com/embed/VRcmLOWbESw', 'VRcmLOWbESw', 'vi', 2040, 'https://i.ytimg.com/vi/VRcmLOWbESw/hqdefault.jpg', 1, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c4_b2',
        Title = N'Toán 12 Bài 12: Tích phân | Kết nối tri thức || VietJack THPT Official',
        Description = N'Định nghĩa Newton-Leibniz, các tính chất tích phân xác định và bài tập vận dụng.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=VRcmLOWbESw',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/VRcmLOWbESw',
        YouTubeVideoId = 'VRcmLOWbESw',
        DurationSeconds = 2040,
        ThumbnailUrl = 'https://i.ytimg.com/vi/VRcmLOWbESw/hqdefault.jpg',
        SortOrder = 1,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c4_b2_1';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c4_b3_1')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c4_b3_1', 'les_math12_c4_b3', N'Toán 12 Bài 13: Ứng dụng hình học của tích phân | Kết nối tri thức || VietJack', N'Tính diện tích hình phẳng và thể tích khối tròn xoay quay quanh trục Ox.', 'youtube', 'https://www.youtube.com/watch?v=hJdOTOpkVCQ',
        'https://www.youtube-nocookie.com/embed/hJdOTOpkVCQ', 'hJdOTOpkVCQ', 'vi', 2250, 'https://i.ytimg.com/vi/hJdOTOpkVCQ/hqdefault.jpg', 1, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c4_b3',
        Title = N'Toán 12 Bài 13: Ứng dụng hình học của tích phân | Kết nối tri thức || VietJack',
        Description = N'Tính diện tích hình phẳng và thể tích khối tròn xoay quay quanh trục Ox.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=hJdOTOpkVCQ',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/hJdOTOpkVCQ',
        YouTubeVideoId = 'hJdOTOpkVCQ',
        DurationSeconds = 2250,
        ThumbnailUrl = 'https://i.ytimg.com/vi/hJdOTOpkVCQ/hqdefault.jpg',
        SortOrder = 1,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c4_b3_1';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c5_b1_1')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c5_b1_1', 'les_math12_c5_b1', N'PHƯƠNG TRÌNH MẶT PHẲNG - TOÁN 12 || Thầy Nguyễn Quốc Chí', N'Lập phương trình mặt phẳng, vectơ pháp tuyến và tính khoảng cách từ điểm đến mặt phẳng.', 'youtube', 'https://www.youtube.com/watch?v=1ZMhsZZOheg',
        'https://www.youtube-nocookie.com/embed/1ZMhsZZOheg', '1ZMhsZZOheg', 'vi', 2190, 'https://i.ytimg.com/vi/1ZMhsZZOheg/hqdefault.jpg', 1, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c5_b1',
        Title = N'PHƯƠNG TRÌNH MẶT PHẲNG - TOÁN 12 || Thầy Nguyễn Quốc Chí',
        Description = N'Lập phương trình mặt phẳng, vectơ pháp tuyến và tính khoảng cách từ điểm đến mặt phẳng.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=1ZMhsZZOheg',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/1ZMhsZZOheg',
        YouTubeVideoId = '1ZMhsZZOheg',
        DurationSeconds = 2190,
        ThumbnailUrl = 'https://i.ytimg.com/vi/1ZMhsZZOheg/hqdefault.jpg',
        SortOrder = 1,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c5_b1_1';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c5_b2_1')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c5_b2_1', 'les_math12_c5_b2', N'Toán 12 Bài 15: Phương trình đường thẳng trong không gian || VietJack THPT Official', N'Vectơ chỉ phương, phương trình tham số, phương trình chính tắc và vị trí tương đối.', 'youtube', 'https://www.youtube.com/watch?v=DX-IxtirjZA',
        'https://www.youtube-nocookie.com/embed/DX-IxtirjZA', 'DX-IxtirjZA', 'vi', 2120, 'https://i.ytimg.com/vi/DX-IxtirjZA/hqdefault.jpg', 1, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c5_b2',
        Title = N'Toán 12 Bài 15: Phương trình đường thẳng trong không gian || VietJack THPT Official',
        Description = N'Vectơ chỉ phương, phương trình tham số, phương trình chính tắc và vị trí tương đối.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=DX-IxtirjZA',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/DX-IxtirjZA',
        YouTubeVideoId = 'DX-IxtirjZA',
        DurationSeconds = 2120,
        ThumbnailUrl = 'https://i.ytimg.com/vi/DX-IxtirjZA/hqdefault.jpg',
        SortOrder = 1,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c5_b2_1';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c5_b3_1')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c5_b3_1', 'les_math12_c5_b3', N'Toán 12 Bài 16: Công thức tính góc trong không gian || VietJack THPT Official', N'Góc giữa hai đường thẳng, góc giữa đường thẳng và mặt phẳng, góc giữa hai mặt phẳng.', 'youtube', 'https://www.youtube.com/watch?v=D2ZZOtsKw58',
        'https://www.youtube-nocookie.com/embed/D2ZZOtsKw58', 'D2ZZOtsKw58', 'vi', 1980, 'https://i.ytimg.com/vi/D2ZZOtsKw58/hqdefault.jpg', 1, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c5_b3',
        Title = N'Toán 12 Bài 16: Công thức tính góc trong không gian || VietJack THPT Official',
        Description = N'Góc giữa hai đường thẳng, góc giữa đường thẳng và mặt phẳng, góc giữa hai mặt phẳng.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=D2ZZOtsKw58',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/D2ZZOtsKw58',
        YouTubeVideoId = 'D2ZZOtsKw58',
        DurationSeconds = 1980,
        ThumbnailUrl = 'https://i.ytimg.com/vi/D2ZZOtsKw58/hqdefault.jpg',
        SortOrder = 1,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c5_b3_1';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c5_b4_1')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c5_b4_1', 'les_math12_c5_b4', N'Toán 12 Bài 17: Phương trình mặt cầu - Kết nối tri thức || VietJack THPT Official', N'Phương trình chính tắc, phương trình tổng quát, điều kiện mặt cầu và vị trí tương đối.', 'youtube', 'https://www.youtube.com/watch?v=wQDy0vf-WD8',
        'https://www.youtube-nocookie.com/embed/wQDy0vf-WD8', 'wQDy0vf-WD8', 'vi', 2010, 'https://i.ytimg.com/vi/wQDy0vf-WD8/hqdefault.jpg', 1, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c5_b4',
        Title = N'Toán 12 Bài 17: Phương trình mặt cầu - Kết nối tri thức || VietJack THPT Official',
        Description = N'Phương trình chính tắc, phương trình tổng quát, điều kiện mặt cầu và vị trí tương đối.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=wQDy0vf-WD8',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/wQDy0vf-WD8',
        YouTubeVideoId = 'wQDy0vf-WD8',
        DurationSeconds = 2010,
        ThumbnailUrl = 'https://i.ytimg.com/vi/wQDy0vf-WD8/hqdefault.jpg',
        SortOrder = 1,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c5_b4_1';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c6_b1_1')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c6_b1_1', 'les_math12_c6_b1', N'Toán 12 Bài 18: Xác suất có điều kiện - Kết nối tri thức || VietJack THPT Official', N'Định nghĩa xác suất có điều kiện, công thức nhân xác suất và ứng dụng sơ đồ cây.', 'youtube', 'https://www.youtube.com/watch?v=Oe-VpvppplA',
        'https://www.youtube-nocookie.com/embed/Oe-VpvppplA', 'Oe-VpvppplA', 'vi', 1850, 'https://i.ytimg.com/vi/Oe-VpvppplA/hqdefault.jpg', 1, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c6_b1',
        Title = N'Toán 12 Bài 18: Xác suất có điều kiện - Kết nối tri thức || VietJack THPT Official',
        Description = N'Định nghĩa xác suất có điều kiện, công thức nhân xác suất và ứng dụng sơ đồ cây.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=Oe-VpvppplA',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/Oe-VpvppplA',
        YouTubeVideoId = 'Oe-VpvppplA',
        DurationSeconds = 1850,
        ThumbnailUrl = 'https://i.ytimg.com/vi/Oe-VpvppplA/hqdefault.jpg',
        SortOrder = 1,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c6_b1_1';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c6_b2_1')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c6_b2_1', 'les_math12_c6_b2', N'Toán 12 Bài 19: Công thức xác suất toàn phần và công thức Bayes || VietJack', N'Hệ biến cố đầy đủ, công thức xác suất toàn phần và định lý Bayes trong bài toán thực tiễn.', 'youtube', 'https://www.youtube.com/watch?v=_aTZ6QynR2U',
        'https://www.youtube-nocookie.com/embed/_aTZ6QynR2U', '_aTZ6QynR2U', 'vi', 2150, 'https://i.ytimg.com/vi/_aTZ6QynR2U/hqdefault.jpg', 1, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c6_b2',
        Title = N'Toán 12 Bài 19: Công thức xác suất toàn phần và công thức Bayes || VietJack',
        Description = N'Hệ biến cố đầy đủ, công thức xác suất toàn phần và định lý Bayes trong bài toán thực tiễn.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=_aTZ6QynR2U',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/_aTZ6QynR2U',
        YouTubeVideoId = '_aTZ6QynR2U',
        DurationSeconds = 2150,
        ThumbnailUrl = 'https://i.ytimg.com/vi/_aTZ6QynR2U/hqdefault.jpg',
        SortOrder = 1,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c6_b2_1';
END

IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = 'vid_math12_c6_b2_2')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        'vid_math12_c6_b2_2', 'les_math12_c6_b2', N'Toán học lớp 12 - Kết nối tri thức - Bài 19 - Công thức xác suất toàn phần và Bayes || Thầy Quang', N'Hướng dẫn chi tiết phương pháp lập bảng xác suất và giải toán Bayes.', 'youtube', 'https://www.youtube.com/watch?v=PsgYDAns3Co',
        'https://www.youtube-nocookie.com/embed/PsgYDAns3Co', 'PsgYDAns3Co', 'vi', 1960, 'https://i.ytimg.com/vi/PsgYDAns3Co/hqdefault.jpg', 2, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = 'les_math12_c6_b2',
        Title = N'Toán học lớp 12 - Kết nối tri thức - Bài 19 - Công thức xác suất toàn phần và Bayes || Thầy Quang',
        Description = N'Hướng dẫn chi tiết phương pháp lập bảng xác suất và giải toán Bayes.',
        Provider = 'youtube',
        SourceUrl = 'https://www.youtube.com/watch?v=PsgYDAns3Co',
        EmbedUrl = 'https://www.youtube-nocookie.com/embed/PsgYDAns3Co',
        YouTubeVideoId = 'PsgYDAns3Co',
        DurationSeconds = 1960,
        ThumbnailUrl = 'https://i.ytimg.com/vi/PsgYDAns3Co/hqdefault.jpg',
        SortOrder = 2,
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'vid_math12_c6_b2_2';
END

COMMIT TRANSACTION;
SELECT 'Full 19-Lesson Math 12 Curriculum & 28 Verified Videos Seeded Successfully!' AS Result;
