import { JiraADFDoc, ADFNode } from './types';

export class ADFConverter {
  /**
   * Helper to create a text node (with optional bold mark)
   */
  private static textNode(text: string, bold = false): ADFNode {
    const node: ADFNode = { type: 'text', text };
    if (bold) {
      node.marks = [{ type: 'strong' }];
    }
    return node;
  }

  /**
   * Helper to create a paragraph node
   */
  private static paragraphNode(textNodes: ADFNode[]): ADFNode {
    return {
      type: 'paragraph',
      content: textNodes,
    };
  }

  /**
   * Helper to create a heading node
   */
  private static headingNode(text: string, level = 2): ADFNode {
    return {
      type: 'heading',
      attrs: { level },
      content: [this.textNode(text)],
    };
  }

  /**
   * Helper to create a list item containing a single paragraph
   */
  private static listItemNode(text: string): ADFNode {
    return {
      type: 'listItem',
      content: [
        this.paragraphNode([this.textNode(text)])
      ],
    };
  }

  /**
   * Converts a WBSItem task and optional StoryPoint estimations into a fully valid Atlassian Document Format (ADF) JSON structure.
   */
  static convertToADF(wbsItem: any, storyPoint?: any): JiraADFDoc {
    const content: ADFNode[] = [];

    // 1. Description Section
    content.push(this.headingNode('Description', 2));
    const descText = wbsItem.description || 'No description provided.';
    const paragraphs = descText.split(/\r?\n/).filter((p: string) => p.trim() !== '');
    if (paragraphs.length > 0) {
      paragraphs.forEach((p: string) => {
        content.push(this.paragraphNode([this.textNode(p)]));
      });
    } else {
      content.push(this.paragraphNode([this.textNode(descText)]));
    }

    // 2. Metadata Section (Strong bullet points)
    content.push(this.headingNode('Task Metadata', 2));
    
    const metadataItems: ADFNode[] = [];
    
    // Type item
    metadataItems.push({
      type: 'listItem',
      content: [
        this.paragraphNode([
          this.textNode('Type: ', true),
          this.textNode(wbsItem.type || 'N/A')
        ])
      ]
    });

    // Status item
    metadataItems.push({
      type: 'listItem',
      content: [
        this.paragraphNode([
          this.textNode('Status: ', true),
          this.textNode(wbsItem.status || 'N/A')
        ])
      ]
    });

    // Methodology item
    if (wbsItem.methodology) {
      metadataItems.push({
        type: 'listItem',
        content: [
          this.paragraphNode([
            this.textNode('Methodology: ', true),
            this.textNode(wbsItem.methodology)
          ])
        ]
      });
    }

    // Story Points / Estimations item
    if (storyPoint) {
      const points = storyPoint.finalPoints !== undefined ? storyPoint.finalPoints : storyPoint.aiSuggestedPoints;
      if (points !== undefined) {
        metadataItems.push({
          type: 'listItem',
          content: [
            this.paragraphNode([
              this.textNode('Story Points: ', true),
              this.textNode(String(points))
            ])
          ]
        });
      }
      if (storyPoint.rationale) {
        metadataItems.push({
          type: 'listItem',
          content: [
            this.paragraphNode([
              this.textNode('Estimation Rationale: ', true),
              this.textNode(storyPoint.rationale)
            ])
          ]
        });
      }
    }

    content.push({
      type: 'bulletList',
      content: metadataItems,
    });

    // 3. Acceptance Criteria Section
    if (wbsItem.acceptanceCriteria && wbsItem.acceptanceCriteria.length > 0) {
      content.push(this.headingNode('Acceptance Criteria', 2));
      const criteriaList = wbsItem.acceptanceCriteria.map((c: string) => this.listItemNode(c));
      content.push({
        type: 'bulletList',
        content: criteriaList,
      });
    }

    // 4. Source Requirements Section
    if (wbsItem.sourceRequirements && wbsItem.sourceRequirements.length > 0) {
      content.push(this.headingNode('Source Requirements', 2));
      const reqList = wbsItem.sourceRequirements.map((r: string) => this.listItemNode(r));
      content.push({
        type: 'bulletList',
        content: reqList,
      });
    }

    // 5. Signature Footer
    content.push({ type: 'rule' });
    content.push(
      this.paragraphNode([
        this.textNode('Synced automatically from Advanced Project Management Platform (APMP).')
      ])
    );

    return {
      type: 'doc',
      version: 1,
      content,
    };
  }
}
